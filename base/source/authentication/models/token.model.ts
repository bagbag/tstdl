import type { Record } from '#/types.js';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt.js';
import type { TokenPayloadBase } from './token-payload-base.model.js';

export type TokenHeader = {
  /**
   * Token version.
   */
  v: number,
};

/**
 * JWT token with custom header.
 * @template AdditionalTokenPayload The type of the additional token payload.
 */
export type Token<AdditionalTokenPayload extends Record = Record<never>> = JwtToken<TokenPayload<AdditionalTokenPayload>, JwtTokenHeader<TokenHeader>>;

/**
 * Token payload.
 * @template T The type of the additional token payload.
 */
export type TokenPayload<T extends Record = Record<never>> = T & TokenPayloadBase;

export type RefreshToken = JwtToken<{
  /**
   * Expiration timestamp in seconds.
   */
  exp: number,

  /**
   * The subject of the token.
   */
  subject: string,

  /**
   * The subject of the impersonator, if any.
   */
  impersonator?: string,

  /**
   * The id of the session.
   */
  sessionId: string,

  /**
   * The secret to use for refreshing the token.
   */
  secret: string,
}>;

export type SecretResetToken = JwtToken<{
  /**
   * Expiration timestamp in seconds.
   */
  exp: number,

  /**
   * The subject for which to reset the secret.
   */
  subject: string,
}>;
