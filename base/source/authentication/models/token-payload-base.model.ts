import { Property } from '#/schema/decorators/property';

export class TokenPayloadBase {
  /** token id */
  @Property()
  jti: string;

  /** issue timestamp in seconds */
  @Property()
  iat: number;

  /** expiration timestamp in seconds */
  @Property()
  exp: number;

  /** refresh token expiration timestamp in seconds */
  @Property()
  refreshTokenExp: number;

  @Property()
  sessionId: string;
}
