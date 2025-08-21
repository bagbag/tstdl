import { Table } from '#/orm/decorators.js';
import { Entity, Unique } from '#/orm/index.js';
import { Integer, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

@Table('credentials')
export class AuthenticationCredentials extends Entity {
  @StringProperty()
  @Unique()
  subject: string;

  @Integer()
  hashVersion: number;

  /**
   * The salt used to hash the secret.
   */
  @Uint8ArrayProperty()
  salt: Uint8Array<ArrayBuffer>;

  /**
   * The hashed secret.
   */
  @Uint8ArrayProperty()
  hash: Uint8Array<ArrayBuffer>;
}
