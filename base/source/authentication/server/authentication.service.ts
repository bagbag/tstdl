import { ForbiddenError } from '#/errors/forbidden.error.js';
import { InvalidTokenError } from '#/errors/invalid-token.error.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import { type AfterResolve, Singleton, afterResolve, inject, provide } from '#/injector/index.js';
import { KeyValueStore } from '#/key-value-store/key-value.store.js';
import { Logger } from '#/logger/logger.js';
import { DatabaseConfig } from '#/orm/server/index.js';
import { EntityRepositoryConfig, injectRepository } from '#/orm/server/repository.js';
import type { BinaryData, Record } from '#/types.js';
import { Alphabet } from '#/utils/alphabet.js';
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

export type CreateTokenData<AdditionalTokenPayload extends Record> = {
  tokenVersion?: number,
  jwtId?: string,
  issuedAt?: number,
  expiration?: number,
  additionalTokenPayload: AdditionalTokenPayload,
  subject: string,
  sessionId: string,
  impersonator: string | undefined,
  refreshTokenExpiration: number,
  timestamp?: number,
};

export class AuthenticationServiceOptions {
  /**
   * Secrets used for signing tokens and refreshTokens
   * If single secret is provided, multiple secrets are derived internally
   */
  secret: string | BinaryData | {
    tokenSigningSecret: Uint8Array,
    refreshTokenSigningSecret: Uint8Array,
    secretResetTokenSigningSecret: Uint8Array,
  };

  /** Token version, forces refresh on mismatch (useful if payload changes) */
  version?: number;

  /** How long a token is valid */
  tokenTimeToLive?: number;

  /** How long a refresh token is valid. Implies session time to live. */
  refreshTokenTimeToLive?: number;

  /** How long a secret reset token is valid. */
  secretResetTokenTimeToLive?: number;
}

export type AuthenticationResult =
  | { success: true, subject: string }
  | { success: false, subject?: undefined };

export type TokenResult<AdditionalTokenPayload extends Record> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>,
  refreshToken: string,
  omitImpersonatorRefreshToken?: boolean,
  impersonatorRefreshToken?: string,
  impersonatorRefreshTokenExpiration?: number,
};

export type SetCredentialsOptions = {
  /** skip validation for password strength */
  skipValidation?: boolean,

  /** skip session invalidation */
  skipSessionInvalidation?: boolean,
};

type CreateTokenResult<AdditionalTokenPayload extends Record> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>,
};

type CreateRefreshTokenResult = {
  token: string,
  jsonToken: RefreshToken,
  salt: Uint8Array,
  hash: Uint8Array,
};

type CreateSecretResetTokenResult = {
  token: string,
  jsonToken: SecretResetToken,
};

type AuthenticationKeyValueStore = {
  derivationSalt: string,
};

const SIGNING_SECRETS_LENGTH = 64;

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

  private readonly tokenVersion = this.#options.version ?? 1;
  private readonly tokenTimeToLive: number = this.#options.tokenTimeToLive ?? (5 * millisecondsPerMinute);
  private readonly refreshTokenTimeToLive = this.#options.refreshTokenTimeToLive ?? (5 * millisecondsPerDay);
  private readonly secretResetTokenTimeToLive = this.#options.secretResetTokenTimeToLive ?? (10 * millisecondsPerMinute);

  private derivedTokenSigningSecret: Uint8Array;
  private derivedRefreshTokenSigningSecret: Uint8Array;
  private derivedSecretResetTokenSigningSecret: Uint8Array;

  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

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

  async endSession(sessionId: string): Promise<void> {
    const now = currentTimestamp();
    await this.#sessionRepository.update(sessionId, { end: now });
  }

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

  async unimpersonate(impersonatorRefreshToken: string, authenticationData: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    return await this.refresh(impersonatorRefreshToken, authenticationData, { omitImpersonator: true });
  }

  async initSecretReset(subject: string, data: AdditionalInitSecretResetData): Promise<void> {
    if (isUndefined(this.#authenticationAncillaryService)) {
      throw new NotImplementedError();
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

  async resetSecret(tokenString: string, newSecret: string): Promise<void> {
    const token = await this.validateSecretResetToken(tokenString);
    await this.setCredentials(token.payload.subject, newSecret);
  }

  async checkSecret(secret: string): Promise<SecretCheckResult> {
    return await this.#authenticationSecretRequirementsValidator.checkSecretRequirements(secret);
  }

  async testSecret(secret: string): Promise<SecretTestResult> {
    return await this.#authenticationSecretRequirementsValidator.testSecretRequirements(secret);
  }

  async validateSecret(secret: string): Promise<void> {
    await this.#authenticationSecretRequirementsValidator.validateSecretRequirements(secret);
  }

  async validateToken(token: string): Promise<Token<AdditionalTokenPayload>> {
    return await getTokenFromString(token, this.tokenVersion, this.derivedTokenSigningSecret);
  }

  async validateRefreshToken(token: string): Promise<RefreshToken> {
    return await getRefreshTokenFromString(token, this.derivedRefreshTokenSigningSecret);
  }

  async validateSecretResetToken(token: string): Promise<SecretResetToken> {
    return await getSecretResetTokenFromString(token, this.derivedSecretResetTokenSigningSecret);
  }

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

  /** Creates a token without session or refresh token and is not saved in database */
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

  /** Creates a refresh token without session or something else. */
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

  private async deriveSigningSecrets(secret: string | BinaryData): Promise<void> {
    const key = await importPbkdf2Key(secret);
    const saltBase64 = await this.#keyValueStore.getOrSet('derivationSalt', encodeBase64(getRandomBytes(32)));
    const salt = decodeBase64(saltBase64);

    const algorithm = { name: 'PBKDF2', hash: 'SHA-512', iterations: 500000, salt };
    const [derivedTokenSigningSecret, derivedRefreshTokenSigningSecret, derivedSecretResetTokenSigningSecret] = await deriveBytesMultiple(algorithm, key, 3, SIGNING_SECRETS_LENGTH);

    this.derivedTokenSigningSecret = derivedTokenSigningSecret;
    this.derivedRefreshTokenSigningSecret = derivedRefreshTokenSigningSecret;
    this.derivedSecretResetTokenSigningSecret = derivedSecretResetTokenSigningSecret;
  }

  private async getHash(secret: string | BinaryData, salt: BinaryData): Promise<Uint8Array> {
    const key = await importPbkdf2Key(secret);
    const hash = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 250000, salt }, key, 512);

    return new Uint8Array(hash);
  }
}
