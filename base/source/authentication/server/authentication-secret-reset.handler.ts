import type { InitSecretResetData } from '../models';

export abstract class AuthenticationSecretResetHandler {
  abstract handleInitSecretReset(data: InitSecretResetData): void | Promise<void>;
}
