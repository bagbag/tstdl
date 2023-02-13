import type { AfterResolve } from '#/container';
import { afterResolve, inject, optional, singleton } from '#/container';
import { InvalidTokenError } from '#/error/invalid-token.error';
import type { Record } from '#/types';
import { Alphabet } from '#/utils/alphabet';
import { importPbkdf2Key } from '#/utils/cryptography';
import { currentTimestamp, currentTimestampSeconds, timestampToTimestampSeconds } from '#/utils/date-time';
import { binaryEquals } from '#/utils/equals';
import { createJwtTokenString, parseAndValidateJwtTokenString } from '#/utils/jwt';
import { getRandomBytes, getRandomString } from '#/utils/random';
import { isUndefined } from '#/utils/type-guards';
import { millisecondsPerDay, millisecondsPerMinute } from '#/utils/units';
import type { NewAuthenticationCredentials, RefreshToken, Token } from '../models';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository';
import { AuthenticationSessionRepository } from './authentication-session.repository';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider';
import { getTokenFromString } from './helper';
import { AUTHENTICATION_SERVICE_OPTIONS } from './tokens';

export type AuthenticationServiceOptions = {
  /** Secret used for signing tokens and refreshTokens */
  secret: string,

  /** Token version, forces refresh on mismatch (useful if payload changes) */
  version?: number,

  /** How long a token is valid */
  tokenTimeToLive?: number,

  /** How long a session is valid after a refreshed. Cannot be refreshed (new token issued) after it timed out. */
  sessionTimeToLive?: number
};

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

const SIGNING_SECRETS_LENGTH = 512;

@singleton()
export class AuthenticationService<AdditionalTokenPayload = Record<never>, AuthenticationData = void> implements AfterResolve {
  private readonly credentialsRepository: AuthenticationCredentialsRepository;
  private readonly sessionRepository: AuthenticationSessionRepository;
  private readonly tokenPayloadProvider: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AuthenticationData> | undefined;

  private readonly secret: string;
  private readonly tokenVersion: number;
  private readonly tokenTimeToLive: number;
  private readonly sessionTimeToLive: number;

  private derivedTokenSigningSecret: Uint8Array;
  private derivedRefreshTokenSigningSecret: Uint8Array;

  constructor(
    credentialsRepository: AuthenticationCredentialsRepository,
    sessionRepository: AuthenticationSessionRepository,
    @inject(AuthenticationTokenPayloadProvider) @optional() tokenPayloadProvider: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AuthenticationData> | undefined,
    @inject(AUTHENTICATION_SERVICE_OPTIONS) options: AuthenticationServiceOptions
  ) {
    this.credentialsRepository = credentialsRepository;
    this.sessionRepository = sessionRepository;
    this.tokenPayloadProvider = tokenPayloadProvider;

    this.secret = options.secret;
    this.tokenVersion = options.version ?? 1;
    this.tokenTimeToLive = options.tokenTimeToLive ?? (5 * millisecondsPerMinute);
    this.sessionTimeToLive = options.sessionTimeToLive ?? (5 * millisecondsPerDay);
  }

  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    await this.deriveSigningSecrets();
  }

  async setCredentials(subject: string, secret: string): Promise<void> {
    const salt = getRandomBytes(32);
    const hash = await this.getHash(secret, salt);

    const credentials: NewAuthenticationCredentials = {
      subject,
      hashVersion: 1,
      salt,
      hash
    };

    await this.credentialsRepository.save(credentials);
  }

  async authenticate(subject: string, secret: string): Promise<AuthenticationResult> {
    const credentials = await this.credentialsRepository.tryLoadBySubject(subject);

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
    const now = currentTimestamp();
    const end = now + this.sessionTimeToLive;

    const session = await this.sessionRepository.insert({
      subject,
      begin: now,
      end,
      refreshTokenHashVersion: 0,
      refreshTokenSalt: new Uint8Array(),
      refreshTokenHash: new Uint8Array()
    });

    const tokenPayload = await this.tokenPayloadProvider?.getTokenPayload(subject, authenticationData);
    const { token, jsonToken } = await this.createToken(tokenPayload!, subject, session.id, end, now);
    const refreshToken = await this.createRefreshToken(subject, session.id, end);

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
    const newEnd = now + this.sessionTimeToLive;
    const tokenPayload = await this.tokenPayloadProvider?.getTokenPayload(session.subject, authenticationData);
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

  async validateToken(token: string): Promise<Token<AdditionalTokenPayload>> {
    return getTokenFromString(token, this.tokenVersion, this.derivedTokenSigningSecret);
  }

  async validateRefreshToken(token: string): Promise<RefreshToken> {
    const validatedToken = await parseAndValidateJwtTokenString<RefreshToken>(token, 'HS256', this.derivedRefreshTokenSigningSecret);

    if (validatedToken.payload.exp <= currentTimestampSeconds()) {
      throw new InvalidTokenError('Token expired.');
    }

    return validatedToken;
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

  private async deriveSigningSecrets(): Promise<void> {
    const key = await importPbkdf2Key(this.secret);
    const hash = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 500000, salt: new Uint8Array() }, key, SIGNING_SECRETS_LENGTH * 2);
    const bufferSize = SIGNING_SECRETS_LENGTH / 8;

    this.derivedTokenSigningSecret = new Uint8Array(hash.slice(0, bufferSize));
    this.derivedRefreshTokenSigningSecret = new Uint8Array(hash.slice(bufferSize));
  }

  private async getHash(secret: string | BinaryData, salt: BinaryData): Promise<Uint8Array> {
    const key = await importPbkdf2Key(secret);
    const hash = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 250000, salt }, key, 512);

    return new Uint8Array(hash);
  }
}
