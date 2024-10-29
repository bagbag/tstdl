import { resolveArgumentType, type Resolvable } from '#/injector/index.js';
import { BooleanProperty, NumberProperty, StringProperty } from '#/schema/index.js';
import { Optional } from '#/schema/schemas/optional.js';
import type { MailData, MailSendResult } from './models/index.js';

export class MailClientAuthConfig {
  @StringProperty()
  user: string;

  @StringProperty()
  password: string;
}

export class MailClientConfig {
  @StringProperty()
  host: string;

  @NumberProperty()
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
