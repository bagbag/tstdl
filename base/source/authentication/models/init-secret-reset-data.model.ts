import { StringProperty } from '#/schema/index.js';

/**
 * Data for initializing a secret reset.
 */
export class InitSecretResetData {
  /**
   * The subject for which to reset the secret.
   * Note: The existence of the subject is not checked to avoid data leaks.
   */
  @StringProperty()
  subject: string;

  /**
   * The secret reset token.
   */
  @StringProperty()
  token: string;
}
