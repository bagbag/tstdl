import { inject, optional, resolveArg, singleton } from '#/container/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { TemplateService } from '#/templates/template.service.js';
import type { TypedOmit } from '#/types.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { formatError } from '#/utils/format-error.js';
import { isDefined } from '#/utils/type-guards.js';
import { MailLogRepository } from './mail-log.repository.js';
import { MailClient } from './mail.client.js';
import type { DefaultMailData, MailData, MailLog, MailSendResult, MailTemplate, NewMailLog } from './models/index.js';
import { MAIL_DEFAULT_DATA } from './tokens.js';

@singleton()
export class MailService {
  private readonly mailClient: MailClient;
  private readonly templateService: TemplateService;
  private readonly mailLogRepository: MailLogRepository | undefined;
  private readonly defaultData: DefaultMailData;
  private readonly logger: Logger;

  constructor(
    mailClient: MailClient,
    templateService: TemplateService,
    @inject(MailLogRepository) @optional() mailLogRepository: MailLogRepository | undefined,
    @resolveArg<LoggerArgument>('MailService') logger: Logger,
    @inject(MAIL_DEFAULT_DATA) @optional() defaultData: DefaultMailData | undefined
  ) {
    this.mailClient = mailClient;
    this.templateService = templateService;
    this.mailLogRepository = mailLogRepository;
    this.defaultData = defaultData ?? {};
    this.logger = logger;
  }

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

  async sendTemplate(keyOrTemplate: string | MailTemplate, mailData: TypedOmit<MailData, 'content' | 'subject'>, templateContext?: object): Promise<MailSendResult> {
    const { name, fields: { subject, html, text } } = await this.templateService.render<MailTemplate>(keyOrTemplate, templateContext);

    const fullMailData = { ...mailData, subject, content: { html, text } };

    return this.send(fullMailData, name);
  }
}
