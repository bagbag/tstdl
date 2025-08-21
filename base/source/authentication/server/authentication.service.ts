import { ForbiddenError } from '#/errors/forbidden.error.js';
import { InvalidCredentialsError } from '#/errors/index.js';
import { InvalidTokenError } from '#/errors/invalid-token.error.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import { type AfterResolve, Singleton, afterResolve, inject, provide } from '#/injector/index.js';
import { KeyValueStore } from '#/key-value-store/key-value.store.js';
import { Logger } from '#/logger/logger.js';
import { DatabaseConfig } from '#/orm/server/index.js';
import { EntityRepositoryConfig, injectRepository } from '#/orm/server/repository.js';
import type { BinaryData, Record } from '#/types/index.js';
import { Alphabet } from '#/utils/alphabet.js';
import { asyncHook } from '#/utils/async-hook/async-hook.js';
import { decodeBase64, encodeBase64 } from '#/utils/base64.js';
import { deriveBytesMultiple, importPbkdf2Key } from '#/utils/cryptography.js';
import { currentTimestamp, timestampToTimestampSeconds } from '#/utils/date-time.js';
import { timingSafeBinaryEquals } from '#/utils/equals.js';
import { createJwtTokenString } from '#/utils/jwt.js';
import { getRandomBytes, getRandomString } from '#/utils/random.js';
import { isBinaryData, isString, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerDay, millisecondsPerMinute } from '#/utils/units.js';
import { AuthenticationCredentials, AuthenticationSession, type InitSecretResetData, type RefreshToken, type SecretCheckResult, type SecretResetToken, type Token } from '../models/index.js';
import { AuthenticationAncillaryService, GetTokenPayloadContextAction } from './authentication-ancillary.service.js';
import { AuthenticationSecretRequirementsValidator, type SecretTestResult } from './authentication-secret-requirements.validator.js';
import { getRefreshTokenFromString, getSecretResetTokenFromString, getTokenFromString } from './helper.js';
import { AuthenticationModuleConfig } from './module.js';

/**
 * Data for creating a token.
 *
 * @param AdditionalTokenPayload Type of additional token payload
 */
export type CreateTokenData<AdditionalTokenPayload extends Record> = {
  /** Token version, forces refresh on mismatch (useful if payload changes) */
  tokenVersion?: number,

  /** Custom token id */
  jwtId?: string,

  /** Custom issued at timestamp */
  issuedAt?: number,

  /** Custom expiration timestamp */
  expiration?: number,

  /** Additional token payload */
  additionalTokenPayload: AdditionalTokenPayload,

  /** Subject of the token */
  subject: string,

  /** Session id */
  sessionId: string,

  /** Impersonator subject */
  impersonator: string | undefined,

  /** Refresh token expiration timestamp */
  refreshTokenExpiration: number,

  /** Timestamp for issued at and expiration calculation */
  timestamp?: number,
};

export class AuthenticationServiceOptions {
  /**
   * Secrets used for signing tokens and refreshTokens.
   * If single secret is provided, multiple secrets are derived internally.
   */
  secret: string | BinaryData<ArrayBuffer> | {
    tokenSigningSecret: Uint8Array<ArrayBuffer>,
    refreshTokenSigningSecret: Uint8Array<ArrayBuffer>,
    secretResetTokenSigningSecret: Uint8Array<ArrayBuffer>,
  };

  /**
   * Token version, forces refresh on mismatch (useful if payload changes).
   *
   * @default 1
   */
  version?: number;

  /**
   * How long a token is valid in milliseconds.
   *
   * @default 5 minutes
   */
  tokenTimeToLive?: number;

  /**
   * How long a refresh token is valid in milliseconds. Implies session time to live.
   *
   * @default 5 days
   */
  refreshTokenTimeToLive?: number;

  /**
   * How long a secret reset token is valid in milliseconds.
   *
   * @default 10 minutes
   */
  secretResetTokenTimeToLive?: number;
}

/**
 * Result of an authentication attempt.
 */
export type AuthenticationResult =
  | { success: true, subject: string }
  | { success: false, subject?: undefined };

/**
 * Result of a token creation.
 *
 * @param AdditionalTokenPayload Type of additional token payload
 */
export type TokenResult<AdditionalTokenPayload extends Record> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>,
  refreshToken: string,
  omitImpersonatorRefreshToken?: boolean,
  impersonatorRefreshToken?: string,
  impersonatorRefreshTokenExpiration?: number,
};

export type SetCredentialsOptions = {
  /**
   * Skip validation for password strength.
   *
   * @default false
   */
  skipValidation?: boolean,

  /**
   * Skip session invalidation.
   *
   * @default false
   */
  skipSessionInvalidation?: boolean,
};

type CreateTokenResult<AdditionalTokenPayload extends Record> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>,
};

type CreateRefreshTokenResult = {
  token: string,
  jsonToken: RefreshToken,
  salt: Uint8Array<ArrayBuffer>,
  hash: Uint8Array<ArrayBuffer>,
};

type CreateSecretResetTokenResult = {
  token: string,
  jsonToken: SecretResetToken,
};

type AuthenticationKeyValueStore = {
  derivationSalt: string,
};

const SIGNING_SECRETS_LENGTH = 64;

/**
 * Handles authentication on server side.
 *
 * Can be used to:
 * - Set credentials
 * - Authenticate
 * - Get token
 * - End session
 * - Refresh token
 * - Impersonate/unimpersonate
 * - Reset secret
 * - Check secret
 *
 * @template AdditionalTokenPayload Type of additional token payload
 * @template AuthenticationData Type of additional authentication data
 * @template AdditionalInitSecretResetData Type of additional secret reset data
 */
@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'authentication' } }),
    { provide: DatabaseConfig, useFactory: (_, context) => context.resolve(AuthenticationModuleConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) },
  ],
})
export class AuthenticationService<AdditionalTokenPayload extends Record = Record<never>, AuthenticationData = void, AdditionalInitSecretResetData = void> implements AfterResolve {
  readonly #credentialsRepository = injectRepository(AuthenticationCredentials);
  readonly #sessionRepository = injectRepository(AuthenticationSession);
  readonly #authenticationSecretRequirementsValidator = inject(AuthenticationSecretRequirementsValidator);
  readonly #authenticationAncillaryService = inject<AuthenticationAncillaryService<AdditionalTokenPayload, AuthenticationData, AdditionalInitSecretResetData>>(AuthenticationAncillaryService, undefined, { optional: true });
  readonly #keyValueStore = inject(KeyValueStore<AuthenticationKeyValueStore>, 'authentication');
  readonly #options = inject(AuthenticationServiceOptions);
  readonly #logger = inject(Logger, 'authentication');

  readonly hooks = {
    beforeLogin: asyncHook<{ subject: string }>(),
    afterLogin: asyncHook<{ subject: string }>(),
    beforeChangeSecret: asyncHook<{ subject: string }>(),
    afterChangeSecret: asyncHook<{ subject: string }>(),
  };

  private readonly tokenVersion = this.#options.version ?? 1;
  private readonly tokenTimeToLive: number = this.#options.tokenTimeToLive ?? (5 * millisecondsPerMinute);
  private readonly refreshTokenTimeToLive = this.#options.refreshTokenTimeToLive ?? (5 * millisecondsPerDay);
  private readonly secretResetTokenTimeToLive = this.#options.secretResetTokenTimeToLive ?? (10 * millisecondsPerMinute);

  private derivedTokenSigningSecret: Uint8Array<ArrayBuffer>;
  private derivedRefreshTokenSigningSecret: Uint8Array<ArrayBuffer>;
  private derivedSecretResetTokenSigningSecret: Uint8Array<ArrayBuffer>;

  /** @internal */
  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

  /**
   * Initializes the service.
   * Derives signing secrets if necessary.
   *
   * @internal
   */
  async initialize(): Promise<void> {
    if (isString(this.#options.secret) || isBinaryData(this.#options.secret)) {
      await this.deriveSigningSecrets(this.#options.secret);
    }
    else {
      this.derivedTokenSigningSecret = this.#options.secret.tokenSigningSecret;
      this.derivedRefreshTokenSigningSecret = this.#options.secret.refreshTokenSigningSecret;
      this.derivedSecretResetTokenSigningSecret = this.#options.secret.secretResetTokenSigningSecret;
    }
  }

  /**
   * Sets the credentials for a subject.
   * This method should not be exposed to the public API without an authenticated current password or secret reset token check.
   * @param subject The subject to set the credentials for.
   * @param secret The secret to set.
   * @param options Options for setting the credentials.
   */
  async setCredentials(subject: string, secret: string, options?: SetCredentialsOptions): Promise<void> {
    // We do not need to avoid information leakage here, as this is a non-public method that is only called by a public api if the secret reset token is valid.
    const actualSubject = await this.resolveSubject(subject);

    if (options?.skipValidation != true) {
      await this.#authenticationSecretRequirementsValidator.validateSecretRequirements(secret);
    }

    const salt = getRandomBytes(32);
    const hash = await this.getHash(secret, salt);

    await this.#credentialsRepository.transaction(async (tx) => {
      await this.#credentialsRepository.withTransaction(tx).upsert('subject', {
        subject: actualSubject,
        hashVersion: 1,
        salt,
        hash,
      });

      if (options?.skipSessionInvalidation != true) {
        await this.#sessionRepository.withTransaction(tx).updateManyByQuery({ subject: actualSubject }, { end: currentTimestamp() });
      }
    });
  }

  /**
   * Authenticates a subject with a secret.
   * @param subject The subject to authenticate.
   * @param secret The secret to authenticate with.
   * @returns The result of the authentication.
   */
  async authenticate(subject: string, secret: string): Promise<AuthenticationResult> {
    const actualSubject = await this.tryResolveSubject(subject) ?? subject;

    // Always try to load credentials, even if the subject is not resolved, to avoid information leakage.
    // If the subject is not resolved, we will create a new credentials entry with an empty salt and hash.
    // This way, we do not leak if the subject exists or not via timing attacks.
    const credentials = await this.#credentialsRepository.tryLoadByQuery({ subject: actualSubject })
      ?? { subject: actualSubject, salt: new Uint8Array(), hash: new Uint8Array() };

    const hash = await this.getHash(secret, credentials.salt);
    const valid = timingSafeBinaryEquals(hash, credentials.hash);

    if (valid) {
      return { success: true, subject: credentials.subject };
    }

    return { success: false };
  }

  /**
   * Gets a token for a subject.
   * @param subject The subject to get the token for.
   * @param authenticationData Additional authentication data.
   * @param options Options for getting the token.
   * @returns The token result.
   */
  async getToken(subject: string, authenticationData: AuthenticationData, { impersonator }: { impersonator?: string } = {}): Promise<TokenResult<AdditionalTokenPayload>> {
    const actualSubject = await this.resolveSubject(subject);
    const now = currentTimestamp();
    const end = now + this.refreshTokenTimeToLive;

    return await this.#sessionRepository.transaction(async (tx) => {
      const session = await this.#sessionRepository.withTransaction(tx).insert({
        subject: actualSubject,
        begin: now,
        end,
        refreshTokenHashVersion: 0,
        refreshTokenSalt: new Uint8Array(),
        refreshTokenHash: new Uint8Array(),
      });

      const tokenPayload = await this.#authenticationAncillaryService?.getTokenPayload(actualSubject, authenticationData, { action: GetTokenPayloadContextAction.GetToken });
      const { token, jsonToken } = await this.createToken({ additionalTokenPayload: tokenPayload!, subject: actualSubject, impersonator, sessionId: session.id, refreshTokenExpiration: end, timestamp: now });
      const refreshToken = await this.createRefreshToken(actualSubject, session.id, end, { impersonator });

      await this.#sessionRepository.withTransaction(tx).update(session.id, {
        end,
        refreshTokenHashVersion: 1,
        refreshTokenSalt: refreshToken.salt,
        refreshTokenHash: refreshToken.hash,
      });

      return { token, jsonToken, refreshToken: refreshToken.token };
    });
  }

  /**
   * Logs in a subject.
   * @param subject The subject to log in.
   * @param secret The secret to log in with.
   * @param data Additional authentication data.
   * @returns Token
   */
  async login(subject: string, secret: string, data: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    const authenticationResult = await this.authenticate(subject, secret);

    if (!authenticationResult.success) {
      throw new InvalidCredentialsError();
    }

    await this.hooks.afterLogin.trigger({ subject: authenticationResult.subject });
    const token = await this.getToken(authenticationResult.subject, data);
    await this.hooks.afterLogin.trigger({ subject: authenticationResult.subject });

    return token;
  }

  /**
   * Ends a session.
   * @param sessionId The id of the session to end.
   */
  async endSession(sessionId: string): Promise<void> {
    const now = currentTimestamp();
    await this.#sessionRepository.update(sessionId, { end: now });
  }

  /**
   * Refreshes a token.
   * @param refreshToken The refresh token to use.
   * @param authenticationData Additional authentication data.
   * @param options Options for refreshing the token.
   * @returns The token result.
   * @throws {InvalidTokenError} If the refresh token is invalid.
   */
  async refresh(refreshToken: string, authenticationData: AuthenticationData, { omitImpersonator = false }: { omitImpersonator?: boolean } = {}): Promise<TokenResult<AdditionalTokenPayload>> {
    const validatedRefreshToken = await this.validateRefreshToken(refreshToken);
    const sessionId = validatedRefreshToken.payload.sessionId;

    const session = await this.#sessionRepository.load(sessionId);
    const hash = await this.getHash(validatedRefreshToken.payload.secret, session.refreshTokenSalt);

    if (session.end <= currentTimestamp()) {
      throw new InvalidTokenError('Session is expired.');
    }

    if (!timingSafeBinaryEquals(hash, session.refreshTokenHash)) {
      throw new InvalidTokenError('Invalid refresh token.');
    }

    const now = currentTimestamp();
    const impersonator = omitImpersonator ? undefined : validatedRefreshToken.payload.impersonator;
    const newEnd = now + this.refreshTokenTimeToLive;
    const tokenPayload = await this.#authenticationAncillaryService?.getTokenPayload(session.subject, authenticationData, { action: GetTokenPayloadContextAction.Refresh });
    const { token, jsonToken } = await this.createToken({ additionalTokenPayload: tokenPayload!, subject: session.subject, sessionId, refreshTokenExpiration: newEnd, impersonator, timestamp: now });
    const newRefreshToken = await this.createRefreshToken(validatedRefreshToken.payload.subject, sessionId, newEnd, { impersonator });

    await this.#sessionRepository.update(sessionId, {
      end: newEnd,
      refreshTokenHashVersion: 1,
      refreshTokenSalt: newRefreshToken.salt,
      refreshTokenHash: newRefreshToken.hash,
    });

    return { token, jsonToken, refreshToken: newRefreshToken.token, omitImpersonatorRefreshToken: omitImpersonator };
  }

  /**
   * Impersonates a subject.
   * @param impersonatorRoken The token of the impersonator.
   * @param impersonatorRefreshToken The refresh token of the impersonator.
   * @param subject The subject to impersonate.
   * @param authenticationData Additional authentication data.
   * @returns The token result.
   * @throws {ForbiddenError} If impersonation is not allowed.
   */
  async impersonate(impersonatorRoken: string, impersonatorRefreshToken: string, subject: string, authenticationData: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    const validatedImpersonatorRoken = await this.validateToken(impersonatorRoken);
    const validatedImpersonatorRefreshToken = await this.validateRefreshToken(impersonatorRefreshToken);

    const allowed = await this.#authenticationAncillaryService?.canImpersonate(validatedImpersonatorRoken.payload, subject, authenticationData) ?? false;

    if (!allowed) {
      throw new ForbiddenError('Impersonation forbidden.');
    }

    const tokenResult = await this.getToken(subject, authenticationData, { impersonator: validatedImpersonatorRoken.payload.subject });

    return {
      ...tokenResult,
      impersonatorRefreshToken,
      impersonatorRefreshTokenExpiration: validatedImpersonatorRefreshToken.payload.exp,
    };
  }

  /**
   * Unimpersonates a subject.
   * @param impersonatorRefreshToken The refresh token of the impersonator.
   * @param authenticationData Additional authentication data.
   * @returns The token result.
   */
  async unimpersonate(impersonatorRefreshToken: string, authenticationData: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    return await this.refresh(impersonatorRefreshToken, authenticationData, { omitImpersonator: true });
  }

  /**
   * Initializes a secret reset. This usually involves sending an email for verification.
   * @param subject The subject to reset the secret for.
   * @param data Additional data for the secret reset.
   * @throws {NotImplementedError} If no ancillary service is registered.
   */
  async initSecretReset(subject: string, data: AdditionalInitSecretResetData): Promise<void> {
    if (isUndefined(this.#authenticationAncillaryService)) {
      throw new NotImplementedError('No ancillary service registered.');
    }

    const actualSubject = await this.tryResolveSubject(subject);

    if (isUndefined(actualSubject)) {
      this.#logger.warn(`Subject "${subject}" not found for secret reset.`);

      /**
       * If the subject cannot be resolved, we do not throw an error here to avoid information leakage.
       * This is to prevent attackers from discovering valid subjects by trying to reset secrets.
       * Instead, we simply log the attempt and return without performing any action.
       */
      return;
    }

    const secretResetToken = await this.createSecretResetToken(actualSubject, currentTimestamp() + this.secretResetTokenTimeToLive);

    const initSecretResetData: InitSecretResetData & AdditionalInitSecretResetData = {
      subject: actualSubject,
      token: secretResetToken.token,
      ...data,
    };

    await this.#authenticationAncillaryService.handleInitSecretReset(initSecretResetData);
  }

  /**
   * Changes a subject's secret.
   * @param subject The subject to change the secret for.
   * @param currentSecret The current secret.
   * @param newSecret The new secret.
   */
  async changeSecret(subject: string, currentSecret: string, newSecret: string): Promise<void> {
    const authenticationResult = await this.authenticate(subject, currentSecret);

    if (!authenticationResult.success) {
      throw new InvalidCredentialsError();
    }

    await this.hooks.beforeChangeSecret.trigger({ subject });
    await this.setCredentials(subject, newSecret);
    await this.hooks.afterChangeSecret.trigger({ subject });
  }

  /**
   * Resets a secret.
   * @param tokenString The secret reset token.
   * @param newSecret The new secret.
   * @throws {InvalidTokenError} If the token is invalid.
   */
  async resetSecret(tokenString: string, newSecret: string): Promise<void> {
    const token = await this.validateSecretResetToken(tokenString);
    await this.setCredentials(token.payload.subject, newSecret);
  }

  /**
   * Checks a secret against the requirements.
   * @param secret The secret to check.
   * @returns The result of the check.
   */
  async checkSecret(secret: string): Promise<SecretCheckResult> {
    return await this.#authenticationSecretRequirementsValidator.checkSecretRequirements(secret);
  }

  /**
   * Tests a secret against the requirements.
   * @param secret The secret to test.
   * @returns The result of the test.
   */
  async testSecret(secret: string): Promise<SecretTestResult> {
    return await this.#authenticationSecretRequirementsValidator.testSecretRequirements(secret);
  }

  /**
   * Validates a secret against the requirements. Throws an error if the requirements are not met.
   * @param secret The secret to validate.
   * @throws {SecretRequirementsError} If the secret does not meet the requirements.
   */
  async validateSecret(secret: string): Promise<void> {
    await this.#authenticationSecretRequirementsValidator.validateSecretRequirements(secret);
  }

  /**
   * Validates a token.
   * @param token The token to validate.
   * @returns The validated token.
   * @throws {InvalidTokenError} If the token is invalid.
   */
  async validateToken(token: string): Promise<Token<AdditionalTokenPayload>> {
    return await getTokenFromString(token, this.tokenVersion, this.derivedTokenSigningSecret);
  }

  /**
   * Validates a refresh token.
   * @param token The refresh token to validate.
   * @returns The validated refresh token.
   * @throws {InvalidTokenError} If the refresh token is invalid.
   */
  async validateRefreshToken(token: string): Promise<RefreshToken> {
    return await getRefreshTokenFromString(token, this.derivedRefreshTokenSigningSecret);
  }

  /**
   * Validates a secret reset token.
   * @param token The secret reset token to validate.
   * @returns The validated secret reset token.
   * @throws {InvalidTokenError} If the secret reset token is invalid.
   */
  async validateSecretResetToken(token: string): Promise<SecretResetToken> {
    return await getSecretResetTokenFromString(token, this.derivedSecretResetTokenSigningSecret);
  }

  /**
   * Tries to resolve a subject.
   * This method is safe to use in public facing APIs as it does not leak information about the existence of a subject.
   * @param subject The subject to resolve.
   * @returns The resolved subject or undefined if the subject could not be resolved.
   */
  async tryResolveSubject(subject: string): Promise<string | undefined> {
    if (isUndefined(this.#authenticationAncillaryService)) {
      return subject;
    }

    const result = await this.#authenticationAncillaryService.resolveSubject(subject);

    if (result.success) {
      return result.subject;
    }

    return undefined;
  }

  /**
   * Resolves the subject to the actual subject used for authentication.
   * This should *not* be used for public facing APIs, as it throws an error if the subject is not found that leaks if the subjects exists or not.
   * Instead use {@link tryResolveSubject} to check if the subject exists without leaking information.
   * @param subject The subject to resolve.
   * @returns The resolved subject or the original subject if not found.
   */
  async resolveSubject(subject: string): Promise<string> {
    if (isUndefined(this.#authenticationAncillaryService)) {
      return subject;
    }

    const result = await this.#authenticationAncillaryService.resolveSubject(subject);

    if (result.success) {
      return result.subject;
    }

    throw new NotFoundError(`Subject not found.`);
  }

  /**
   * Creates a token without session or refresh token and is not saved in database.
   * @param data Data for creating the token.
   * @returns The created token.
   */
  async createToken({ tokenVersion, jwtId, issuedAt, expiration, additionalTokenPayload, subject, sessionId, refreshTokenExpiration, impersonator: impersonatedBy, timestamp = currentTimestamp() }: CreateTokenData<AdditionalTokenPayload>): Promise<CreateTokenResult<AdditionalTokenPayload>> {
    const header: Token<AdditionalTokenPayload>['header'] = {
      v: tokenVersion ?? this.tokenVersion,
      alg: 'HS256',
      typ: 'JWT',
    };

    const payload: Token<AdditionalTokenPayload>['payload'] = {
      jti: jwtId ?? getRandomString(24, Alphabet.LowerUpperCaseNumbers),
      iat: issuedAt ?? timestampToTimestampSeconds(timestamp),
      exp: expiration ?? timestampToTimestampSeconds(timestamp + this.tokenTimeToLive),
      refreshTokenExp: timestampToTimestampSeconds(refreshTokenExpiration),
      sessionId,
      subject,
      impersonator: impersonatedBy,
      ...additionalTokenPayload,
    };

    const jsonToken: Token<AdditionalTokenPayload> = {
      header,
      payload,
    };

    const token = await createJwtTokenString(jsonToken, this.derivedTokenSigningSecret);

    return { token, jsonToken };
  }

  /**
   * Creates a refresh token without session and is not saved in database.
   * @param subject The subject of the refresh token.
   * @param sessionId The session id of the refresh token.
   * @param expirationTimestamp The expiration timestamp of the refresh token.
   * @param options Options for creating the refresh token.
   * @returns The created refresh token.
   */
  async createRefreshToken(subject: string, sessionId: string, expirationTimestamp: number, options?: { impersonator?: string }): Promise<CreateRefreshTokenResult> {
    const secret = getRandomString(64, Alphabet.LowerUpperCaseNumbers);
    const salt = getRandomBytes(32);
    const hash = await this.getHash(secret, salt);

    const jsonToken: RefreshToken = {
      header: {
        alg: 'HS256',
        typ: 'JWT',
      },
      payload: {
        exp: timestampToTimestampSeconds(expirationTimestamp),
        subject,
        impersonator: options?.impersonator,
        sessionId,
        secret,
      },
    };

    const token = await createJwtTokenString(jsonToken, this.derivedRefreshTokenSigningSecret);

    return { token, jsonToken, salt, hash: new Uint8Array(hash) };
  }

  private async createSecretResetToken(subject: string, expirationTimestamp: number): Promise<CreateSecretResetTokenResult> {
    const jsonToken: SecretResetToken = {
      header: {
        alg: 'HS256',
        typ: 'JWT',
      },
      payload: {
        exp: timestampToTimestampSeconds(expirationTimestamp),
        subject,
      },
    };

    const token = await createJwtTokenString(jsonToken, this.derivedSecretResetTokenSigningSecret);

    return { token, jsonToken };
  }

  private async deriveSigningSecrets(secret: string | BinaryData<ArrayBuffer>): Promise<void> {
    const key = await importPbkdf2Key(secret);
    const saltBase64 = await this.#keyValueStore.getOrSet('derivationSalt', encodeBase64(getRandomBytes(32)));
    const salt = decodeBase64(saltBase64);

    const algorithm = { name: 'PBKDF2', hash: 'SHA-512', iterations: 500000, salt };
    const [derivedTokenSigningSecret, derivedRefreshTokenSigningSecret, derivedSecretResetTokenSigningSecret] = await deriveBytesMultiple(algorithm, key, 3, SIGNING_SECRETS_LENGTH);

    this.derivedTokenSigningSecret = derivedTokenSigningSecret;
    this.derivedRefreshTokenSigningSecret = derivedRefreshTokenSigningSecret;
    this.derivedSecretResetTokenSigningSecret = derivedSecretResetTokenSigningSecret;
  }

  private async getHash(secret: string | BinaryData<ArrayBuffer>, salt: BinaryData<ArrayBuffer>): Promise<Uint8Array<ArrayBuffer>> {
    const key = await importPbkdf2Key(secret);
    const hash = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 250000, salt }, key, 512);

    return new Uint8Array(hash);
  }
}
