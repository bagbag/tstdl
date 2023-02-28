import { Property } from '#/schema';

export class InitSecretResetData {
  /** Subject is not checked for existence may not existence. */
  @Property()
  subject: string;

  @Property()
  token: string;
}
