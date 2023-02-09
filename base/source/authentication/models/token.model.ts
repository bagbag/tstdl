import type { Record } from '#/types';
import type { JwtToken, JwtTokenHeader } from '#/utils/jwt';
import type { TokenPayloadBase } from '../models';

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
