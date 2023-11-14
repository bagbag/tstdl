import type { Record } from '#/types.js';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt.js';
import type { TokenPayloadBase } from './token-payload-base.model.js';

export type TokenHeader = {
  v: number
};

export type Token<AdditionalTokenPayload extends Record = Record<never>> = JwtToken<TokenPayload<AdditionalTokenPayload>, JwtTokenHeader<TokenHeader>>;

export type TokenPayload<T extends Record = Record<never>> = T & TokenPayloadBase;

export type RefreshToken = JwtToken<{
  /** expiration timestamp in seconds */
  exp: number,

  subject: string,
  impersonator?: string,
  sessionId: string,
  secret: string
}>;

export type SecretResetToken = JwtToken<{
  exp: number,
  subject: string
}>;
