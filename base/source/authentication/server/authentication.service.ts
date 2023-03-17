import type { AfterResolve } from '#/container/index.js';
import { afterResolve, inject, optional, singleton } from '#/container/index.js';
import { InvalidTokenError } from '#/error/invalid-token.error.js';
import { NotImplementedError } from '#/error/not-implemented.error.js';
import type { Record } from '#/types.js';
import { Alphabet } from '#/utils/alphabet.js';
import { deriveBytesMultiple, importPbkdf2Key } from '#/utils/cryptography.js';
import { currentTimestamp, timestampToTimestampSeconds } from '#/utils/date-time.js';
import { binaryEquals } from '#/utils/equals.js';
import { createJwtTokenString } from '#/utils/jwt.js';
import { getRandomBytes, getRandomString } from '#/utils/random.js';
import { isBinaryData, isString, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerDay, millisecondsPerMinute } from '#/utils/units.js';
import type { InitSecretResetData, NewAuthenticationCredentials, RefreshToken, SecretCheckResult, SecretResetToken, Token } from '../models/index.js';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository.js';
import { AuthenticationSecretRequirementsValidator } from './authentication-secret-requirements.validator.js';
import { AuthenticationSecretResetHandler } from './authentication-secret-reset.handler.js';
import { AuthenticationSessionRepository } from './authentication-session.repository.js';
import { AuthenticationSubjectResolver } from './authentication-subject.resolver.js';
import { AuthenticationTokenPayloadProvider, GetTokenPayloadContextAction } from './authentication-token-payload.provider.js';
import { getRefreshTokenFromString, getSecretResetTokenFromString, getTokenFromString } from './helper.js';

export class AuthenticationServiceOptions {
  /**
   * Secrets used for signing tokens and refreshTokens
   * If single secret is provided, multiple secrets are derived internally
   */
  secret: string | BinaryData | {
    tokenSigningSecret: Uint8Array,
    refreshTokenSigningSecret: Uint8Array,
    secretResetTokenSigningSecret: Uint8Array
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

export type TokenResult<AdditionalTokenPayload = Record<never>> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>,
  refreshToken: string
};

type CreateTokenResult<AdditionalTokenPayload> = {
  token: string,
  jsonToken: Token<AdditionalTokenPayload>
};

type CreateRefreshTokenResult = {
  token: string,
  jsonToken: RefreshToken,
  salt: Uint8Array,
  hash: Uint8Array
};

type CreateSecretResetTokenResult = {
  token: string,
  jsonToken: SecretResetToken
};

const SIGNING_SECRETS_LENGTH = 64;


@singleton()
export class AuthenticationService<AdditionalTokenPayload = Record<never>, AuthenticationData = void> implements AfterResolve {
  private readonly credentialsRepository: AuthenticationCredentialsRepository;
  private readonly sessionRepository: AuthenticationSessionRepository;
  private readonly authenticationSecretRequirementsValidator: AuthenticationSecretRequirementsValidator;
  private readonly tokenPayloadProvider: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AuthenticationData> | undefined;
  private readonly subjectResolver: AuthenticationSubjectResolver | undefined;
  private readonly authenticationResetSecretHandler: AuthenticationSecretResetHandler | undefined;
  private readonly options: AuthenticationServiceOptions;

  private readonly secret: string;
  private readonly tokenVersion: number;
  private readonly tokenTimeToLive: number;
  private readonly refreshTokenTimeToLive: number;
  private readonly secretResetTokenTimeToLive: number;

  private derivedTokenSigningSecret: Uint8Array;
  private derivedRefreshTokenSigningSecret: Uint8Array;
  private derivedSecretResetTokenSigningSecret: Uint8Array;

  constructor(
    credentialsRepository: AuthenticationCredentialsRepository,
    sessionRepository: AuthenticationSessionRepository,
    authenticationSecretRequirementsValidator: AuthenticationSecretRequirementsValidator,
    @inject(AuthenticationSubjectResolver) @optional() subjectResolver: AuthenticationSubjectResolver | undefined,
    @inject(AuthenticationTokenPayloadProvider) @optional() tokenPayloadProvider: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AuthenticationData> | undefined,
    @inject(AuthenticationSecretResetHandler) @optional() authenticationResetSecretHandler: AuthenticationSecretResetHandler | undefined,
    options: AuthenticationServiceOptions
  ) {
    this.credentialsRepository = credentialsRepository;
    this.sessionRepository = sessionRepository;
    this.authenticationSecretRequirementsValidator = authenticationSecretRequirementsValidator;
    this.subjectResolver = subjectResolver;
    this.tokenPayloadProvider = tokenPayloadProvider;
    this.authenticationResetSecretHandler = authenticationResetSecretHandler;
    this.options = options;

    this.tokenVersion = options.version ?? 1;
    this.tokenTimeToLive = options.tokenTimeToLive ?? (5 * millisecondsPerMinute);
    this.refreshTokenTimeToLive = options.refreshTokenTimeToLive ?? (5 * millisecondsPerDay);
    this.secretResetTokenTimeToLive = options.secretResetTokenTimeToLive ?? (10 * millisecondsPerMinute);
  }

  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    if (isString(this.options.secret) || isBinaryData(this.options.secret)) {
      await this.deriveSigningSecrets(this.options.secret);
    }
    else {
      this.derivedTokenSigningSecret = this.options.secret.tokenSigningSecret;
      this.derivedRefreshTokenSigningSecret = this.options.secret.refreshTokenSigningSecret;
      this.derivedSecretResetTokenSigningSecret = this.options.secret.secretResetTokenSigningSecret;
    }
  }

  async setCredentials(subject: string, secret: string): Promise<void> {
    const actualSubject = await this.resolveSubject(subject);

    await this.authenticationSecretRequirementsValidator.validateSecretRequirements(secret);

    const salt = getRandomBytes(32);
    const hash = await this.getHash(secret, salt);

    const credentials: NewAuthenticationCredentials = {
      subject: actualSubject,
      hashVersion: 1,
      salt,
      hash
    };

    await this.credentialsRepository.save(credentials);
  }

  async authenticate(subject: string, secret: string): Promise<AuthenticationResult> {
    const actualSubject = await this.resolveSubject(subject);
    const credentials = await this.credentialsRepository.tryLoadBySubject(actualSubject);

    if (isUndefined(credentials)) {
      return { success: false };
    }

    const hash = await this.getHash(secret, credentials.salt);
    const valid = binaryEquals(hash, credentials.hash);

    if (valid) {
      return { success: true, subject: credentials.subject };
    }

    return { success: false };
  }

  async getToken(subject: string, authenticationData: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    const actualSubject = await this.resolveSubject(subject);
    const now = currentTimestamp();
    const end = now + this.refreshTokenTimeToLive;

    const session = await this.sessionRepository.insert({
      subject: actualSubject,
      begin: now,
      end,
      refreshTokenHashVersion: 0,
      refreshTokenSalt: new Uint8Array(),
      refreshTokenHash: new Uint8Array()
    });

    const tokenPayload = await this.tokenPayloadProvider?.getTokenPayload(actualSubject, authenticationData, { action: GetTokenPayloadContextAction.GetToken });
    const { token, jsonToken } = await this.createToken(tokenPayload!, actualSubject, session.id, end, now);
    const refreshToken = await this.createRefreshToken(actualSubject, session.id, end);

    await this.sessionRepository.extend(session.id, {
      end,
      refreshTokenHashVersion: 1,
      refreshTokenSalt: refreshToken.salt,
      refreshTokenHash: refreshToken.hash
    });

    return { token, jsonToken, refreshToken: refreshToken.token };
  }

  async endSession(sessionId: string): Promise<void> {
    const now = currentTimestamp();
    await this.sessionRepository.end(sessionId, now);
  }

  async refresh(refreshToken: string, authenticationData: AuthenticationData): Promise<TokenResult<AdditionalTokenPayload>> {
    const validatedToken = await this.validateRefreshToken(refreshToken);
    const sessionId = validatedToken.payload.sessionId;

    const session = await this.sessionRepository.load(sessionId);
    const hash = await this.getHash(validatedToken.payload.secret, session.refreshTokenSalt);

    if (session.end <= currentTimestamp()) {
      throw new InvalidTokenError('Session is expired.');
    }

    if (!binaryEquals(hash, session.refreshTokenHash)) {
      throw new InvalidTokenError('Invalid refresh token.');
    }

    const now = currentTimestamp();
    const newEnd = now + this.refreshTokenTimeToLive;
    const tokenPayload = await this.tokenPayloadProvider?.getTokenPayload(session.subject, authenticationData, { action: GetTokenPayloadContextAction.Refresh });
    const { token, jsonToken } = await this.createToken(tokenPayload!, session.subject, sessionId, newEnd, now);
    const newRefreshToken = await this.createRefreshToken(validatedToken.payload.subject, sessionId, newEnd);

    await this.sessionRepository.extend(sessionId, {
      end: newEnd,
      refreshTokenHashVersion: 1,
      refreshTokenSalt: newRefreshToken.salt,
      refreshTokenHash: newRefreshToken.hash
    });

    return { token, jsonToken, refreshToken: newRefreshToken.token };
  }

  async initResetSecret(subject: string): Promise<void> {
    if (isUndefined(this.authenticationResetSecretHandler)) {
      throw new NotImplementedError();
    }

    const actualSubject = await this.resolveSubject(subject);
    const secretResetToken = await this.createSecretResetToken(actualSubject, currentTimestamp() + this.secretResetTokenTimeToLive);

    const initSecretResetData: InitSecretResetData = {
      subject: actualSubject,
      token: secretResetToken.token
    };

    await this.authenticationResetSecretHandler.handleInitSecretReset(initSecretResetData);
  }

  async resetSecret(tokenString: string, newSecret: string): Promise<void> {
    const token = await this.validateSecretResetToken(tokenString);
    await this.setCredentials(token.payload.subject, newSecret);
  }

  async checkSecret(secret: string): Promise<SecretCheckResult> {
    return this.authenticationSecretRequirementsValidator.checkSecretRequirements(secret);
  }

  async validateToken(token: string): Promise<Token<AdditionalTokenPayload>> {
    return getTokenFromString(token, this.tokenVersion, this.derivedTokenSigningSecret);
  }

  async validateRefreshToken(token: string): Promise<RefreshToken> {
    return getRefreshTokenFromString(token, this.derivedRefreshTokenSigningSecret);
  }

  async validateSecretResetToken(token: string): Promise<SecretResetToken> {
    return getSecretResetTokenFromString(token, this.derivedSecretResetTokenSigningSecret);
  }

  async resolveSubject(subject: string): Promise<string> {
    return this.subjectResolver?.resolveSubject(subject) ?? subject;
  }

  private async createToken(additionalTokenPayload: AdditionalTokenPayload, subject: string, sessionId: string, refreshTokenExpiration: number, timestamp: number): Promise<CreateTokenResult<AdditionalTokenPayload>> {
    const header: Token<AdditionalTokenPayload>['header'] = {
      v: this.tokenVersion,
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload: Token<AdditionalTokenPayload>['payload'] = {
      jti: getRandomString(24, Alphabet.LowerUpperCaseNumbers),
      iat: timestampToTimestampSeconds(timestamp),
      exp: timestampToTimestampSeconds(timestamp + this.tokenTimeToLive),
      refreshTokenExp: timestampToTimestampSeconds(refreshTokenExpiration),
      sessionId,
      subject,
      ...additionalTokenPayload
    };

    const jsonToken: Token<AdditionalTokenPayload> = {
      header,
      payload
    };

    const token = await createJwtTokenString<Token<AdditionalTokenPayload>>(jsonToken, this.derivedTokenSigningSecret);

    return { token, jsonToken };
  }

  private async createRefreshToken(subject: string, sessionId: string, expirationTimestamp: number): Promise<CreateRefreshTokenResult> {
    const secret = getRandomString(64, Alphabet.LowerUpperCaseNumbers);
    const salt = getRandomBytes(32);
    const hash = await this.getHash(secret, salt);

    const jsonToken: RefreshToken = {
      header: {
        alg: 'HS256',
        typ: 'JWT'
      },
      payload: {
        exp: timestampToTimestampSeconds(expirationTimestamp),
        subject,
        sessionId,
        secret
      }
    };

    const token = await createJwtTokenString<RefreshToken>(jsonToken, this.derivedRefreshTokenSigningSecret);

    return { token, jsonToken, salt, hash: new Uint8Array(hash) };
  }

  private async createSecretResetToken(subject: string, expirationTimestamp: number): Promise<CreateSecretResetTokenResult> {
    const jsonToken: SecretResetToken = {
      header: {
        alg: 'HS256',
        typ: 'JWT'
      },
      payload: {
        exp: timestampToTimestampSeconds(expirationTimestamp),
        subject
      }
    };

    const token = await createJwtTokenString<SecretResetToken>(jsonToken, this.derivedSecretResetTokenSigningSecret);

    return { token, jsonToken };
  }

  private async deriveSigningSecrets(secret: string | BinaryData): Promise<void> {
    const key = await importPbkdf2Key(secret);
    const algorithm = { name: 'PBKDF2', hash: 'SHA-512', iterations: 500000, salt: new Uint8Array() };
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
