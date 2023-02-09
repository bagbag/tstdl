import { Class } from '#/reflection';
import type { AuthenticationCredentials, NewAuthenticationCredentials } from '../models';

@Class()
export abstract class AuthenticationCredentialsRepository {
  abstract tryLoadBySubject(subject: string): Promise<AuthenticationCredentials | undefined>;
  abstract save(credentials: NewAuthenticationCredentials | AuthenticationCredentials): Promise<void>;
}
