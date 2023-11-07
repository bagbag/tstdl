import { Property } from '#/schema/decorators/property.js';

export class InitSecretResetData {
  /** Subject is not checked for existence. */
  @Property()
  subject: string;

  @Property()
  token: string;
}
