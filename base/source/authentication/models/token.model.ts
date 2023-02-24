import type { Record } from '#/types.js';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt.js';
import type { TokenPayloadBase } from '../models/token-payload-base.model.js';

export type TokenHeader = {
  v: number
};

export type Token<AdditionalTokenPayload = Record<never>> = JwtToken<AdditionalTokenPayload & TokenPayloadBase, JwtTokenHeader<TokenHeader>>;

export type TokenPayload<T> = T & TokenPayloadBase;

export type RefreshTokenPayload = {
  /** expiration timestamp in seconds */
  exp: number,

  subject: string,
  sessionId: string,
  secret: string
};

export type RefreshToken = JwtToken<RefreshTokenPayload>;
