import type { NewEntity } from '#/database';
import type { AuthenticationSession } from './models';

export type AuthenticationSessionExtendData = {
  end: number,
  tokenId: string,
  refreshTokenHashVersion: number,
  refreshTokenSalt: Uint8Array,
  refreshTokenHash: Uint8Array
};

export abstract class AuthenticationSessionRepository {
  abstract insert(authenticationSession: NewEntity<AuthenticationSession>): Promise<AuthenticationSession>;

  abstract load(id: string): Promise<AuthenticationSession>;

  abstract extend(id: string, data: AuthenticationSessionExtendData): Promise<void>;

  abstract end(id: string, timestamp: number): Promise<void>;
}
