import { container } from '#/container/index.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { MailLogRepository } from './mail-log.repository.js';
import { MailClient, MailClientConfig } from './mail.client.js';
import type { DefaultMailData } from './models/index.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

export type MailModuleConfig = {
  clientConfig: MailClientConfig,
  client: Type<MailClient>,
  logRepository: Type<MailLogRepository>,
  defaultData: DefaultMailData
};

/**
 * configure mail module
 */
export function configureMail({ clientConfig, client, logRepository, defaultData }: Partial<MailModuleConfig>): void {
  if (isDefined(clientConfig)) {
    container.registerSingleton(MailClientConfig, { useValue: clientConfig });
  }

  if (isDefined(client)) {
    container.registerSingleton(MailClient, { useToken: client });
  }

  if (isDefined(logRepository)) {
    container.registerSingleton(MailLogRepository, { useToken: logRepository });
  }

  if (isDefined(defaultData)) {
    container.registerSingleton(MAIL_DEFAULT_DATA, { useValue: defaultData });
  }
}
