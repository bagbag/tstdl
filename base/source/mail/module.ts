import { container, stubClass } from '#/container';
import type { Type } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { MailLogRepository } from './mail-log.repository';
import { MailTemplateProvider } from './mail-template.provider';
import type { MailTemplateRenderer } from './mail-template.renderer';
import type { MailClientConfig } from './mail.client';
import { MailClient } from './mail.client';
import { MAIL_CLIENT_CONFIG, MAIL_TEMPLATE_RENDERERS } from './tokens';

export type MailModuleConfig = {
  clientConfig: MailClientConfig,
  client: Type<MailClient>,
  logRepository: Type<MailLogRepository> | undefined,
  templateProvider: Type<MailTemplateProvider>,
  templateRenderers: Type<MailTemplateRenderer>[]
  // queueKey: string | undefined
};

export const mailModuleConfig: MailModuleConfig = {
  clientConfig: { host: '127.0.0.1', port: 25 },
  client: stubClass(MailClient),
  logRepository: stubClass(MailLogRepository),
  templateProvider: stubClass(MailTemplateProvider),
  templateRenderers: []
  // queueKey: undefined
};

/**
 * configure mail module
 */
export function configureMail({ clientConfig, client, logRepository, templateProvider, templateRenderers /* , queueKey */ }: Partial<MailModuleConfig>): void {
  // mailModuleConfig.queueKey = queueKey ?? mailModuleConfig.queueKey;

  if (isDefined(clientConfig)) {
    container.registerSingleton(MAIL_CLIENT_CONFIG, { useValue: clientConfig });
  }

  if (isDefined(client)) {
    container.registerSingleton(MailClient, { useToken: client });
  }

  if (isDefined(logRepository)) {
    container.registerSingleton(MailLogRepository, { useToken: logRepository });
  }

  if (isDefined(templateRenderers)) {
    container.registerSingleton(MAIL_TEMPLATE_RENDERERS, { useValue: templateRenderers });
  }

  if (isDefined(templateProvider)) {
    container.registerSingleton(MailTemplateProvider, { useToken: templateProvider });
  }
}
