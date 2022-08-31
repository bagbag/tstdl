import { container, stubClass } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { MailLogRepository } from './mail-log.repository';
import type { MailClientConfig } from './mail.client';
import { MailClient } from './mail.client';
import { MAIL_CLIENT_CONFIG } from './tokens';

export type MailModuleConfig = {
  clientConfig: MailClientConfig,
  client: Type<MailClient>,
  logRepository: Type<MailLogRepository> | undefined
};

export const mailModuleConfig: MailModuleConfig = {
  clientConfig: { host: '127.0.0.1', port: 25 },
  client: stubClass(MailClient),
  logRepository: stubClass(MailLogRepository)
};

/**
 * configure mail module
 */
export function configureMail({ clientConfig, client, logRepository }: Partial<MailModuleConfig>): void {
  if (isDefined(clientConfig)) {
    container.registerSingleton(MAIL_CLIENT_CONFIG, { useValue: clientConfig });
  }

  if (isDefined(client)) {
    container.registerSingleton(MailClient, { useToken: client });
  }

  if (isDefined(logRepository)) {
    container.registerSingleton(MailLogRepository, { useToken: logRepository });
  }
}
