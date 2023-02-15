import { BadRequestError } from '#/error/bad-request.error';
import { InvalidTokenError } from '#/error/invalid-token.error';
import type { HttpServerRequest } from '#/http/server';
import type { OneOrMany, Record } from '#/types';
import { currentTimestampSeconds } from '#/utils/date-time';
import { parseAndValidateJwtTokenString } from '#/utils/jwt';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards';
import type { Token } from '../models';

/**
 *
 * @param request
 * @param cookieName (default "authorization")
 * @returns token string
 */
export function tryGetAuthorizationTokenStringFromRequest(request: HttpServerRequest, cookieName: string = 'authorization'): string | undefined {
  const authorizationHeaders = request.headers.tryGet('Authorization') as OneOrMany<string> | undefined;

  const authorizationString = (isArray(authorizationHeaders) ? authorizationHeaders[0] : authorizationHeaders)
    ?? request.cookies.tryGet(cookieName);

  if (isDefined(authorizationString)) {
    const authorizationSchemeEnd = authorizationString.indexOf(' ');
    const authorizationScheme = authorizationString.slice(0, authorizationSchemeEnd).trim().toLowerCase();

    if (authorizationScheme == 'bearer') {
      throw new BadRequestError(`Unsupported authorization scheme "${authorizationScheme}".`);
    }

    const authorization = authorizationString.slice(authorizationSchemeEnd).trim();
    return authorization;
  }

  return undefined;
}

export async function tryGetTokenFromRequest<AdditionalTokenPayload = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload> | undefined> {
  const tokenString = tryGetAuthorizationTokenStringFromRequest(request);

  if (isUndefined(tokenString)) {
    return undefined;
  }

  return getTokenFromString(tokenString, tokenVersion, secret);
}

export async function getTokenFromRequest<AdditionalTokenPayload = Record<never>>(request: HttpServerRequest, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload>> {
  const token = await tryGetTokenFromRequest<AdditionalTokenPayload>(request, tokenVersion, secret);

  if (isUndefined(token)) {
    throw new InvalidTokenError('Missing authorization token');
  }

  return token;
}

export async function getTokenFromString<AdditionalTokenPayload = Record<never>>(tokenString: string, tokenVersion: number, secret: string | BinaryData): Promise<Token<AdditionalTokenPayload>> {
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