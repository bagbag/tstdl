import type { InitSecretResetData } from '../models/init-secret-reset-data.model.js';

export abstract class AuthenticationSecretResetHandler {
  abstract handleInitSecretReset(data: InitSecretResetData): void | Promise<void>;
}
