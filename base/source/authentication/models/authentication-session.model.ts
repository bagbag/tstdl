import { Table } from '#/orm/decorators.js';
import { Entity } from '#/orm/entity.js';
import { Timestamp } from '#/orm/types.js';
import { Integer, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

@Table('session')
export class AuthenticationSession extends Entity {
  @StringProperty()
  subject: string;

  @Timestamp()
  begin: Timestamp;

  @Timestamp()
  end: Timestamp;

  @Integer()
  refreshTokenHashVersion: number;

  /**
   * The salt used to hash the refresh token.
   */
  @Uint8ArrayProperty()
  refreshTokenSalt: Uint8Array<ArrayBuffer>;

  /**
   * The hashed refresh token.
   */
  @Uint8ArrayProperty()
  refreshTokenHash: Uint8Array<ArrayBuffer>;
}
