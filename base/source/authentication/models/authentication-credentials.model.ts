import { NumberProperty, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

export class AuthenticationCredentials {
  @StringProperty()
  id: string;

  @StringProperty()
  subject: string;

  @NumberProperty()
  hashVersion: number;

  @Uint8ArrayProperty()
  salt: Uint8Array;

  @Uint8ArrayProperty()
  hash: Uint8Array;
}

export class NewAuthenticationCredentials {
  @StringProperty()
  subject: string;

  @NumberProperty()
  hashVersion: number;

  @Uint8ArrayProperty()
  salt: Uint8Array;

  @Uint8ArrayProperty()
  hash: Uint8Array;
}
