import { NumberProperty, StringProperty } from '#/schema/index.js';

export class TokenPayloadBase {
  /** Token id */
  @StringProperty()
  jti: string;

  /** Issue timestamp in seconds */
  @NumberProperty()
  iat: number;

  /** Expiration timestamp in seconds */
  @NumberProperty()
  exp: number;

  /** Refresh token expiration timestamp in seconds */
  @NumberProperty()
  refreshTokenExp: number;

  @StringProperty()
  sessionId: string;

  @StringProperty()
  subject: string;

  @StringProperty({ optional: true })
  impersonator?: string;
}
