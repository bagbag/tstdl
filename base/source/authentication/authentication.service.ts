import { inject, singleton } from '#/container';
import { UnauthorizedError } from '#/error';
import { InvalidTokenError } from '#/error/invalid-token.error';
import { Alphabet } from '#/utils/alphabet';
import { importPbkdf2Key } from '#/utils/cryptography';
import { currentTimestamp, timestampToTimestampSeconds } from '#/utils/date-time';
import { binaryEquals } from '#/utils/equals';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt';
import { createJwtTokenString, parseAndValidateJwtTokenString } from '#/utils/jwt';
import { getRandomBytes, getRandomString } from '#/utils/random';
import { isUndefined } from '#/utils/type-guards';
import { millisecondsPerDay, millisecondsPerMinute } from '#/utils/units';
import { AuthenticationCredentialsRepository } from './authentication-credentials.repository';
import { AuthenticationSessionRepository } from './authentication-session.repository';
import { AuthenticationTokenPayloadProvider } from './authentication-token-payload.provider';
import type { NewAuthenticationCredentials, TokenPayloadBase } from './models';
import { AUTHENTICATION_SERVICE_OPTIONS } from './tokens';


export type Token<AdditionalTokenPayload> = JwtToken<AdditionalTokenPayload & TokenPayloadBase, JwtTokenHeader<TokenHeader>>;

export type TokenHeader = {
  v: number
};

export type AuthenticationServiceOptions = {
  /** Secret used for signing tokens */
  secret: string,

  /** Token version, forces refresh on mismatch (useful if payload changes) */
  version?: number,

  /** How long a token is valid */
  tokenTimeToLive?: number,

  /** How long a session is valid after a refreshed. Cannot be refreshed (new token issued) after it timed out. */
  sessionTimeToLive?: number
};

export type AuthenticationResult = {
  token: string,
  refreshToken: string
};

type CreateTokenResult<AdditionalTokenPayload> = {
  header: Token<AdditionalTokenPayload>['header'],
  payload: Token<AdditionalTokenPayload>['payload'],
  token: string
};

type CreateRefreshTokenResult = {
  token: string,
  salt: Uint8Array,
  hash: Uint8Array
};

@singleton()
export class AuthenticationService<AdditionalTokenPayload, AdditionalAuthenticationData> {
  private readonly credentialsRepository: AuthenticationCredentialsRepository;
  private readonly sessionRepository: AuthenticationSessionRepository;
  private readonly tokenPayloadProviderService: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AdditionalAuthenticationData>;

  private readonly secret: string;
  private readonly tokenVersion: number;
  private readonly tokenTimeToLive: number;
  private readonly sessionTimeToLive: number;

  constructor(
    credentialsService: AuthenticationCredentialsRepository,
    sessionRepository: AuthenticationSessionRepository,
    tokenPayloadProviderService: AuthenticationTokenPayloadProvider<AdditionalTokenPayload, AdditionalAuthenticationData>,
    @inject(AUTHENTICATION_SERVICE_OPTIONS) options: AuthenticationServiceOptions
  ) {
    this.credentialsRepository = credentialsService;
    this.sessionRepository = sessionRepository;
    this.tokenPayloadProviderService = tokenPayloadProviderService;

    this.secret = options.secret;
    this.tokenVersion = options.version ?? 1;
    this.tokenTimeToLive = options.tokenTimeToLive ?? (5 * millisecondsPerMinute);
    this.sessionTimeToLive = options.sessionTimeToLive ?? (5 * millisecondsPerDay);
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

  async authenticate(subject: string, secret: string): Promise<boolean> {
    const credentials = await this.credentialsRepository.tryLoad(subject);

    if (isUndefined(credentials)) {
      return false;
    }

    const hash = await this.getHash(secret, credentials.salt);
    return binaryEquals(hash, credentials.hash);
  }

  async getToken(subject: string, secret: string, additionalAuthenticationData: AdditionalAuthenticationData): Promise<AuthenticationResult> {
    const isAuthenticated = await this.authenticate(subject, secret);

    if (!isAuthenticated) {
      throw new UnauthorizedError('Invalid credentials.');
    }

    const now = currentTimestamp();

    const tokenPayload = await this.tokenPayloadProviderService.getTokenPayload(subject, additionalAuthenticationData);
    const { token, payload } = await this.createToken(tokenPayload, now);
    const refreshToken = await this.createRefreshToken();

    await this.sessionRepository.insert({
      subject,
      begin: now,
      end: now + this.sessionTimeToLive,
      tokenId: payload.jti,
      refreshTokenHashVersion: 1,
      refreshTokenSalt: refreshToken.salt,
      refreshTokenHash: refreshToken.hash
    });

    return { token, refreshToken: refreshToken.token };
  }

  async endSession(sessionId: string): Promise<void> {
    const now = currentTimestamp();
    await this.sessionRepository.end(sessionId, now);
  }

  async refresh(sessionId: string, refreshToken: string, additionalAuthenticationData: AdditionalAuthenticationData): Promise<AuthenticationResult> {
    const session = await this.sessionRepository.load(sessionId);
    const hash = await this.getHash(refreshToken, session.refreshTokenSalt);

    if (session.end <= currentTimestamp()) {
      throw new UnauthorizedError('Session is ended.');
    }

    if (!binaryEquals(hash, session.refreshTokenHash)) {
      throw new UnauthorizedError('Invalid refresh token.');
    }

    const now = currentTimestamp();
    const tokenPayload = await this.tokenPayloadProviderService.getTokenPayload(session.subject, additionalAuthenticationData);
    const { token, payload } = await this.createToken(tokenPayload, now);
    const newRefreshToken = await this.createRefreshToken();

    await this.sessionRepository.extend(sessionId, {
      end: now + this.sessionTimeToLive,
      tokenId: payload.jti,
      refreshTokenHashVersion: 1,
      refreshTokenSalt: newRefreshToken.salt,
      refreshTokenHash: newRefreshToken.hash
    });

    return { token, refreshToken: newRefreshToken.token };
  }

  async validateToken(token: string): Promise<Token<AdditionalTokenPayload>> {
    const validatedToken = await parseAndValidateJwtTokenString<Token<AdditionalTokenPayload>>(token, 'HS256', this.secret);

    if (validatedToken.header.v != this.tokenVersion) {
      throw new InvalidTokenError('Invalid token version.');
    }

    return validatedToken;
  }

  private async createToken(additionalTokenPayload: AdditionalTokenPayload, timestamp: number = currentTimestamp()): Promise<CreateTokenResult<AdditionalTokenPayload>> {
    const header: Token<AdditionalTokenPayload>['header'] = {
      v: this.tokenVersion,
      alg: 'HS256',
      typ: 'JWT'
    };

    const payload: Token<AdditionalTokenPayload>['payload'] = {
      jti: getRandomString(24, Alphabet.LowerUpperCaseNumbers),
      iat: timestampToTimestampSeconds(timestamp),
      exp: timestampToTimestampSeconds(timestamp + this.tokenTimeToLive),
      ...additionalTokenPayload
    };

    const token = await createJwtTokenString<Token<AdditionalTokenPayload>>({
      header,
      payload
    }, this.secret);

    return { header, payload, token };
  }

  private async createRefreshToken(): Promise<CreateRefreshTokenResult> {
    const token = getRandomString(64, Alphabet.LowerUpperCaseNumbers);
    const salt = getRandomBytes(32);
    const hash = await this.getHash(token, salt);

    return { token, salt, hash: new Uint8Array(hash) };
  }

  private async getHash(secret: string, salt: BinaryData): Promise<Uint8Array> {
    const key = await importPbkdf2Key(secret);
    const hash = await globalThis.crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-512', iterations: 250000, salt }, key, 512);

    return new Uint8Array(hash);
  }
}
