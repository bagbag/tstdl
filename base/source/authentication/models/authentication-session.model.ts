import { Property } from '#/schema/index.js';

export class AuthenticationSession {
  @Property()
  id: string;

  @Property()
  subject: string;

  /** timestamp */
  @Property()
  begin: number;

  /** timestamp */
  @Property()
  end: number;

  @Property()
  refreshTokenHashVersion: number;

  @Property()
  refreshTokenSalt: Uint8Array;

  @Property()
  refreshTokenHash: Uint8Array;
}

export class NewAuthenticationSession {
  @Property()
  subject: string;

  @Property()
  begin: number;

  @Property()
  end: number;

  @Property()
  refreshTokenHashVersion: number;

  @Property()
  refreshTokenSalt: Uint8Array;

  @Property()
  refreshTokenHash: Uint8Array;
}
