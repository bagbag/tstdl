import { inject, optional, resolveArg, singleton } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { TemplateService } from '#/templates';
import type { TypedOmit } from '#/types';
import { currentTimestamp } from '#/utils/date-time';
import { formatError } from '#/utils/format-error';
import { isDefined } from '#/utils/type-guards';
import { MailLogRepository } from './mail-log.repository';
import { MailClient } from './mail.client';
import type { MailData, MailLog, MailSendResult, MailTemplate, NewMailLog } from './models';
import { DefaultMailData } from './models';
import { MAIL_DEFAULT_DATA } from './tokens';


@singleton()
export class MailService {
  private readonly mailClient: MailClient;
  private readonly templateService: TemplateService;
  private readonly mailLogRepository: MailLogRepository | undefined;
  private readonly defaultData: DefaultMailData;
  private readonly logger: Logger;
  private readonly mailDataSourceTemplateKey: WeakMap<MailData, string>;

  constructor(
    mailClient: MailClient,
    templateService: TemplateService,
    @inject(MailLogRepository) @optional() mailLogRepository: MailLogRepository | undefined,
    @inject(MAIL_DEFAULT_DATA) defaultData: DefaultMailData,
    @resolveArg<LoggerArgument>(MailService.name) logger: Logger
  ) {
    this.mailClient = mailClient;
    this.templateService = templateService;
    this.mailLogRepository = mailLogRepository;
    this.defaultData = defaultData;
    this.logger = logger;

    this.mailDataSourceTemplateKey = new WeakMap();
  }

  async send(mailData: MailData): Promise<MailSendResult> {
    const data: MailData = { ...this.defaultData, ...mailData };

    let mailLog: MailLog | undefined;

    if (isDefined(this.mailLogRepository)) {
      const log: NewMailLog = {
        timestamp: currentTimestamp(),
        templateKey: this.mailDataSourceTemplateKey.get(data) ?? null,
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

  async sendTemplate(key: string, mailData: TypedOmit<MailData, 'content' | 'subject'>, templateContext?: object): Promise<MailSendResult> {
    const { fields: { subject, html, text } } = await this.templateService.render<MailTemplate>(key, templateContext);

    const fullMailData = { ...mailData, subject, content: { html, text } };

    this.mailDataSourceTemplateKey.set(fullMailData, key);
    return this.send(fullMailData);
  }
}
