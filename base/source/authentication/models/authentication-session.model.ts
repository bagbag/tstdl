import { Entity } from '#/orm/entity.js';
import { Timestamp } from '#/orm/types.js';
import { Integer, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

export class AuthenticationSession extends Entity {
  @StringProperty()
  subject: string;

  @Timestamp()
  begin: Timestamp;

  @Timestamp()
  end: Timestamp;

  @Integer()
  refreshTokenHashVersion: number;

  @Uint8ArrayProperty()
  refreshTokenSalt: Uint8Array;

  @Uint8ArrayProperty()
  refreshTokenHash: Uint8Array;
}
