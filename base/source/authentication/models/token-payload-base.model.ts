import { NumberProperty, StringProperty } from '#/schema/index.js';

/**
 * Base for token payloads.
 */
export class TokenPayloadBase {
  /**
   * Token id.
   */
  @StringProperty()
  jti: string;

  /**
   * Issue timestamp in seconds.
   */
  @NumberProperty()
  iat: number;

  /**
   * Expiration timestamp in seconds.
   */
  @NumberProperty()
  exp: number;

  /**
   * Refresh token expiration timestamp in seconds.
   */
  @NumberProperty()
  refreshTokenExp: number;

  /**
   * The id of the session.
   */
  @StringProperty()
  sessionId: string;

  /**
   * The subject of the token.
   */
  @StringProperty()
  subject: string;

  /**
   * The subject of the impersonator, if any.
   */
  @StringProperty({ optional: true })
  impersonator?: string;
}
