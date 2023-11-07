import type { InitSecretResetData } from '../models/init-secret-reset-data.model.js';

export abstract class AuthenticationSecretResetHandler<AdditionalInitSecretResetData> {
  abstract handleInitSecretReset(data: InitSecretResetData & AdditionalInitSecretResetData): void | Promise<void>;
}
