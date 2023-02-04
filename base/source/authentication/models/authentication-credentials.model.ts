import { Property } from '#/schema';

export class AuthenticationCredentials {
  @Property()
  id: string;

  @Property()
  subject: string;

  @Property()
  hashVersion: number;

  @Property()
  salt: Uint8Array;

  @Property()
  hash: Uint8Array;
}

export class NewAuthenticationCredentials {
  @Property()
  subject: string;

  @Property()
  hashVersion: number;

  @Property()
  salt: Uint8Array;

  @Property()
  hash: Uint8Array;
}
