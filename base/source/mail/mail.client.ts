import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';
import type { MailData, MailSendResult } from './models';

export type MailClientConfig = {
  host: string,
  port: number,

  /* enable TLS (if not defined it is automatically set depending on port) */
  secure?: boolean,

  auth?: {
    user: string,
    password: string
  }
};

export abstract class MailClient implements Injectable<MailClientConfig> {
  readonly [resolveArgumentType]: MailClientConfig;

  abstract send(data: MailData): Promise<MailSendResult>;
}
