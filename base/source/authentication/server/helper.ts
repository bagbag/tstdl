import { BadRequestError } from '#/errors/bad-request.error.js';
import { InvalidTokenError } from '#/errors/invalid-token.error.js';
import type { HttpServerRequest } from '#/http/server/index.js';
import type { BinaryData, OneOrMany, Record } from '#/types.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { parseAndValidateJwtTokenString } from '#/utils/jwt.js';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { RefreshToken, SecretResetToken, Token } from '../models/index.js';

/**
 *
 * @param request
 * @param cookieName (default "authorization")
 * @returns token string
 */
export function tryGetAuthorizationTokenStringFromRequest(request: HttpServerRequest, cookieName: string = 'authorization', fromCookieOnly: boolean = false): string | undefined {
  const authorizationHeaders = (fromCookieOnly || (cookieName.toLocaleLowerCase() != 'authorization')) ? undefined : (request.headers.tryGet('Authorization') as OneOrMany<string> | undefined);

  const authorizationString = (isArray(authorizationHeaders) ? authorizationHeaders[0] : authorizationHeaders)
    ?? request.cookies.tryGet(cookieName);

  if (isDefined(authorizationString)) {
    const authorizationSchemeEnd = authorizationString.indexOf(' ');
    const authorizationScheme = authorizationString.slice(0, authorizationSchemeEnd).trim().toLowerCase();

    if (authorizationScheme != 'bearer') {
      throw new BadRequestError(`Unsupported authorization scheme "${authorizationScheme}".`);
    }

    const authorization = authorizationString.slice(authorizationSchemeEnd).trim();
    return authorization;
  }

  return undefined;
}

export async function tryGetTokenFromRequest<AdditionalTokenPayload extends Record = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload> | undefined> {
  const tokenString = tryGetAuthorizationTokenStringFromRequest(request);

  if (isUndefined(tokenString)) {
    return undefined;
  }

  return getTokenFromString(tokenString, tokenVersion, secret);
}

export async function getTokenFromRequest<AdditionalTokenPayload extends Record = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload>> {
  const token = await tryGetTokenFromRequest<AdditionalTokenPayload>(request, tokenVersion, secret);

  if (isUndefined(token)) {
    throw new InvalidTokenError('Missing authorization token');
  }

  return token;
}

export async function getTokenFromString<AdditionalTokenPayload extends Record = Record<never>>(tokenString: string, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload>> {
  if (isUndefined(tokenString)) {
    throw new InvalidTokenError('Missing authorization token');
  }

  const validatedToken = await parseAndValidateJwtTokenString<Token<AdditionalTokenPayload>>(tokenString, 'HS256', secret);

  if (validatedToken.header.v != tokenVersion) {
    throw new InvalidTokenError('Invalid token version');
  }

  if (validatedToken.payload.exp <= currentTimestampSeconds()) {
    throw new InvalidTokenError('Token expired');
  }

  return validatedToken;
}

export async function getRefreshTokenFromString(tokenString: string, secret: string | BinaryData): Promise<RefreshToken> {
  if (isUndefined(tokenString)) {
    throw new InvalidTokenError('Missing refresh token');
  }

  const validatedRefreshToken = await parseAndValidateJwtTokenString<RefreshToken>(tokenString, 'HS256', secret);

  if (validatedRefreshToken.payload.exp <= currentTimestampSeconds()) {
    throw new InvalidTokenError('Refresh token expired.');
  }

  return validatedRefreshToken;
}

export async function getSecretResetTokenFromString(tokenString: string, secret: string | BinaryData): Promise<SecretResetToken> {
  if (isUndefined(tokenString)) {
    throw new InvalidTokenError('Missing secret reset token');
  }

  const validatedSecretResetToken = await parseAndValidateJwtTokenString<SecretResetToken>(tokenString, 'HS256', secret);

  if (validatedSecretResetToken.payload.exp <= currentTimestampSeconds()) {
    throw new InvalidTokenError('Secret reset token expired.');
  }

  return validatedSecretResetToken;
}
