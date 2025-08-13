import { Singleton, inject, provide } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { DatabaseConfig, EntityRepositoryConfig, injectRepository } from '#/orm/server/index.js';
import { TemplateService } from '#/templates/template.service.js';
import type { TypedOmit } from '#/types/index.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { assertDefined } from '#/utils/type-guards.js';
import { MailClient, MailClientConfig } from './mail.client.js';
import { MailLog, type MailData, type MailSendResult, type MailTemplate } from './models/index.js';
import { MailModuleConfig } from './module.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'mail' } }),
    provide(DatabaseConfig, { useFactory: (_, context) => context.resolve(MailModuleConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) })
  ]
})
export class MailService {
  readonly #mailClient = inject(MailClient);
  readonly #templateService = inject(TemplateService);
  readonly #mailLogRepository = injectRepository(MailLog);
  readonly #defaultClientConfig = inject(MailClientConfig, undefined, { optional: true });
  readonly #defaultData = inject(MAIL_DEFAULT_DATA, undefined, { optional: true });
  readonly #logger = inject(Logger, 'MailService');

  async send(mailData: MailData, clientConfig?: MailClientConfig): Promise<MailSendResult>;
  /** @deprecated internal */
  async send(mailData: MailData, clientConfig?: MailClientConfig, templateName?: string): Promise<MailSendResult>;
  async send(mailData: MailData, clientConfigOrTemplateName?: MailClientConfig, templateNameOrNothing?: string): Promise<MailSendResult> {
    const clientConfig = (typeof clientConfigOrTemplateName == 'object') ? clientConfigOrTemplateName : this.#defaultClientConfig;
    const templateName = (typeof clientConfigOrTemplateName == 'object') ? templateNameOrNothing : clientConfigOrTemplateName;
    assertDefined(clientConfig, 'No mail client config provided.');

    const data: MailData = { ...this.#defaultData, ...mailData };

    let mailLog: MailLog | undefined;

    mailLog = await this.#mailLogRepository.insert({
      timestamp: currentTimestamp(),
      template: templateName ?? null,
      data,
      sendResult: null,
      errors: null
    });

    try {
      const result = await this.#mailClient.send(data, clientConfig);
      await this.#mailLogRepository.update(mailLog.id, { sendResult: result });

      return result;
    }
    catch (error) {
      try {
        await this.#mailLogRepository.update(mailLog.id, { errors: [formatError(error)] });
      }
      catch (logError) {
        this.#logger.error(logError as Error);
      }

      throw error;
    }
  }

  async sendTemplate<Context extends object>(keyOrTemplate: string | MailTemplate<Context>, mailData: TypedOmit<MailData, 'content' | 'subject'>, templateContext?: Context, clientConfig?: MailClientConfig): Promise<MailSendResult> {
    const { name, fields: { subject, html, text } } = await this.#templateService.render(keyOrTemplate, templateContext);

    const fullMailData = { ...mailData, subject, content: { html, text } };

    return this.send(fullMailData, clientConfig, name);
  }
}
