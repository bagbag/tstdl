import { StringProperty } from '#/schema/index.js';

export class InitSecretResetData {
  /** Subject is not checked for existence. */
  @StringProperty()
  subject: string;

  @StringProperty()
  token: string;
}
