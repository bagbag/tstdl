import { NumberProperty, StringProperty, Uint8ArrayProperty } from '#/schema/index.js';

export class AuthenticationSession {
  @StringProperty()
  id: string;

  @StringProperty()
  subject: string;

  /** Timestamp */
  @NumberProperty()
  begin: number;

  /** Timestamp */
  @NumberProperty()
  end: number;

  @NumberProperty()
  refreshTokenHashVersion: number;

  @Uint8ArrayProperty()
  refreshTokenSalt: Uint8Array;

  @Uint8ArrayProperty()
  refreshTokenHash: Uint8Array;
}

export class NewAuthenticationSession {
  @StringProperty()
  subject: string;

  @NumberProperty()
  begin: number;

  @NumberProperty()
  end: number;

  @NumberProperty()
  refreshTokenHashVersion: number;

  @Uint8ArrayProperty()
  refreshTokenSalt: Uint8Array;

  @Uint8ArrayProperty()
  refreshTokenHash: Uint8Array;
}
