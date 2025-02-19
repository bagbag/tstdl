import { Entity, Unique } from '#/orm/index.js';
import { Integer, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

export class AuthenticationCredentials extends Entity {
  @StringProperty()
  @Unique()
  subject: string;

  @Integer()
  hashVersion: number;

  @Uint8ArrayProperty()
  salt: Uint8Array;

  @Uint8ArrayProperty()
  hash: Uint8Array;
}
