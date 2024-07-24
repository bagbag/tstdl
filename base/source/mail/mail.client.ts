import { resolveArgumentType, type Resolvable } from '#/injector/index.js';
import { Property } from '#/schema/decorators/property.js';
import { BooleanProperty } from '#/schema/index.js';
import { Optional } from '#/schema/schemas/optional.js';
import type { MailData, MailSendResult } from './models/index.js';

export class MailClientAuthConfig {
  @Property()
  user: string;

  @Property()
  password: string;
}

export class MailClientConfig {
  @Property()
  host: string;

  @Property()
  port: number;

  /** Enable TLS (if not defined it is automatically set depending on port) */
  @BooleanProperty({ optional: true })
  secure?: boolean;

  @Optional(MailClientAuthConfig)
  auth?: MailClientAuthConfig;
}

export abstract class MailClient implements Resolvable<MailClientConfig> {
  declare readonly [resolveArgumentType]: MailClientConfig;

  abstract send(data: MailData, clientConfig?: MailClientConfig): Promise<MailSendResult>;
}
