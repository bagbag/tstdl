import { Singleton, inject } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { TemplateService } from '#/templates/template.service.js';
import type { TypedOmit } from '#/types.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { assertDefined, isDefined } from '#/utils/type-guards.js';
import { MailClient, MailClientConfig } from './mail.client.js';
import type { MailData, MailLog, MailSendResult, MailTemplate, NewMailLog } from './models/index.js';
import { MailLogRepository } from './repositories/mail-log.repository.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

@Singleton()
export class MailService {
  readonly #mailClient = inject(MailClient);
  readonly #templateService = inject(TemplateService);
  readonly #mailLogRepository = inject(MailLogRepository, undefined, { optional: true });
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

    if (isDefined(this.#mailLogRepository)) {
      const log: NewMailLog = {
        timestamp: currentTimestamp(),
        template: templateName ?? null,
        data,
        sendResult: null,
        errors: null
      };

      mailLog = await this.#mailLogRepository.insert(log);
    }

    try {
      const result = await this.#mailClient.send(data, clientConfig);

      if (isDefined(mailLog)) {
        await this.#mailLogRepository!.patch(mailLog, { sendResult: result });
      }

      return result;
    }
    catch (error) {
      try {
        if (isDefined(mailLog)) {
          await this.#mailLogRepository!.patch(mailLog, { errors: [formatError(error)] });
        }
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
