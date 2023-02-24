import type { Injectable } from '#/container/index.js';
import { resolveArgumentType } from '#/container/index.js';
import { Property } from '#/schema/decorators/property.js';
import { BooleanProperty } from '#/schema/schemas/boolean.js';
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

  @BooleanProperty({ optional: true })
  /* enable TLS (if not defined it is automatically set depending on port) */
  secure?: boolean;

  @Optional(MailClientAuthConfig)
  auth?: MailClientAuthConfig;
}

export abstract class MailClient implements Injectable<MailClientConfig> {
  readonly [resolveArgumentType]: MailClientConfig;

  abstract send(data: MailData): Promise<MailSendResult>;
}
