import { BadRequestError } from '#/errors/bad-request.error.js';
import { InvalidTokenError } from '#/errors/invalid-token.error.js';
import type { HttpServerRequest } from '#/http/server/index.js';
import type { BinaryData, OneOrMany, Record } from '#/types.js';
import { currentTimestampSeconds } from '#/utils/date-time.js';
import { parseAndValidateJwtTokenString } from '#/utils/jwt.js';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards.js';
import type { RefreshToken, SecretResetToken, Token } from '../models/index.js';

/**
 * Tries to get the authorization token string from a request.
 * @param request The request to get the token from.
 * @param cookieName The name of the cookie to get the token from (defaults to 'authorization').
 * @param fromCookieOnly Whether to only get the token from the cookie.
 * @returns The token string or undefined if not found.
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

/**
 * Tries to get a token from a request.
 * @param request The request to get the token from.
 * @param tokenVersion The version of the token to get.
 * @param secret The secret to use for validation.
 * @returns The token or undefined if not found.
 * @throws {InvalidTokenError} If the token is invalid.
 */
export async function tryGetTokenFromRequest<AdditionalTokenPayload extends Record = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload> | undefined> {
  const tokenString = tryGetAuthorizationTokenStringFromRequest(request);

  if (isUndefined(tokenString)) {
    return undefined;
  }

  return getTokenFromString(tokenString, tokenVersion, secret);
}

/**
 * Gets a token from a request.
 * @param request The request to get the token from.
 * @param tokenVersion The version of the token to get.
 * @param secret The secret to use for validation.
 * @returns The token.
 * @throws {InvalidTokenError} If the token is invalid or not found.
 */
export async function getTokenFromRequest<AdditionalTokenPayload extends Record = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload>> {
  const token = await tryGetTokenFromRequest<AdditionalTokenPayload>(request, tokenVersion, secret);

  if (isUndefined(token)) {
    throw new InvalidTokenError('Missing authorization token');
  }

  return token;
}

/**
 * Gets a token from a token string.
 * @param tokenString The token string to get the token from.
 * @param tokenVersion The version of the token to get.
 * @param secret The secret to use for validation.
 * @returns The token.
 * @throws {InvalidTokenError} If the token is invalid.
 */
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

/**
 * Gets a refresh token from a token string.
 * @param tokenString The token string to get the refresh token from.
 * @param secret The secret to use for validation.
 * @returns The refresh token.
 * @throws {InvalidTokenError} If the refresh token is invalid.
 */
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

/**
 * Gets a secret reset token from a token string.
 * @param tokenString The token string to get the secret reset token from.
 * @param secret The secret to use for validation.
 * @returns The secret reset token.
 * @throws {InvalidTokenError} If the secret reset token is invalid.
 */
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
