import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../models/index.js';

export abstract class AuthenticationCredentialsRepository {
  abstract tryLoadBySubject(subject: string): Promise<AuthenticationCredentials | undefined>;
  abstract save(credentials: NewAuthenticationCredentials | AuthenticationCredentials): Promise<void>;
}
