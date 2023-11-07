import { Singleton, inject } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { TemplateService } from '#/templates/template.service.js';
import type { TypedOmit } from '#/types.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { isDefined } from '#/utils/type-guards.js';
import { MailClient } from './mail.client.js';
import type { MailData, MailLog, MailSendResult, MailTemplate, NewMailLog } from './models/index.js';
import { MailLogRepository } from './repositories/mail-log.repository.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

@Singleton()
export class MailService {
  private readonly mailClient = inject(MailClient);
  private readonly templateService = inject(TemplateService);
  private readonly mailLogRepository = inject(MailLogRepository, undefined, { optional: true });
  private readonly defaultData = inject(MAIL_DEFAULT_DATA, undefined, { optional: true });
  private readonly logger = inject(Logger, 'MailService');

  async send(mailData: MailData): Promise<MailSendResult>;
  /** @deprecated internal */
  async send(mailData: MailData, templateName?: string): Promise<MailSendResult>;
  async send(mailData: MailData, templateName?: string): Promise<MailSendResult> {
    const data: MailData = { ...this.defaultData, ...mailData };

    let mailLog: MailLog | undefined;

    if (isDefined(this.mailLogRepository)) {
      const log: NewMailLog = {
        timestamp: currentTimestamp(),
        template: templateName ?? null,
        data,
        sendResult: null,
        errors: null
      };

      mailLog = await this.mailLogRepository.insert(log);
    }

    try {
      const result = await this.mailClient.send(data);

      if (isDefined(mailLog)) {
        await this.mailLogRepository!.patch(mailLog, { sendResult: result });
      }

      return result;
    }
    catch (error) {
      try {
        if (isDefined(mailLog)) {
          await this.mailLogRepository!.patch(mailLog, { errors: [formatError(error)] });
        }
      }
      catch (logError) {
        this.logger.error(logError as Error);
      }

      throw error;
    }
  }

  async sendTemplate<Context extends object>(keyOrTemplate: string | MailTemplate<Context>, mailData: TypedOmit<MailData, 'content' | 'subject'>, templateContext?: Context): Promise<MailSendResult> {
    const { name, fields: { subject, html, text } } = await this.templateService.render(keyOrTemplate, templateContext);

    const fullMailData = { ...mailData, subject, content: { html, text } };

    return this.send(fullMailData, name);
  }
}
