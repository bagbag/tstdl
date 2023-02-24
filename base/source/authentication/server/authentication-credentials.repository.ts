import { Class } from '#/reflection/index.js';
import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../models/index.js';

@Class()
export abstract class AuthenticationCredentialsRepository {
  abstract tryLoadBySubject(subject: string): Promise<AuthenticationCredentials | undefined>;
  abstract save(credentials: NewAuthenticationCredentials | AuthenticationCredentials): Promise<void>;
}
