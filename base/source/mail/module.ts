import { Injector } from '#/injector/injector.js';
import type { Type } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import { MailClient, MailClientConfig } from './mail.client.js';
import type { DefaultMailData } from './models/index.js';
import { MailLogRepository } from './repositories/mail-log.repository.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

export type MailModuleConfig = {
  defaultClientConfig: MailClientConfig,
  client: Type<MailClient>,
  logRepository: Type<MailLogRepository>,
  defaultData: DefaultMailData
};

/**
 * configure mail module
 */
export function configureMail({ defaultClientConfig, client, logRepository, defaultData }: Partial<MailModuleConfig>): void {
  if (isDefined(defaultClientConfig)) {
    Injector.registerSingleton(MailClientConfig, { useValue: defaultClientConfig });
  }

  if (isDefined(client)) {
    Injector.registerSingleton(MailClient, { useToken: client });
  }

  if (isDefined(logRepository)) {
    Injector.registerSingleton(MailLogRepository, { useToken: logRepository });
  }

  if (isDefined(defaultData)) {
    Injector.registerSingleton(MAIL_DEFAULT_DATA, { useValue: defaultData });
  }
}
