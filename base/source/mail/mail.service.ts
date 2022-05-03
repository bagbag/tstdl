import { inject, optional, resolveArg, singleton } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { Queue } from '#/queue';
import type { TypedOmit } from '#/types';
import { currentTimestamp } from '#/utils/date-time';
import { formatError } from '#/utils/helpers';
import { isDefined } from '#/utils/type-guards';
import { MailLogRepository } from './mail-log.repository';
import { MailTemplateRendererProvider } from './mail-template-renderer.provider';
import { MailTemplateProvider } from './mail-template.provider';
import { MailClient } from './mail.client';
import type { MailData, MailLog, MailSendResult, NewMailLog } from './models';

@singleton()
export class MailService {
  private readonly mailClient: MailClient;
  private readonly mailTemplateProvider: MailTemplateProvider;
  private readonly mailTemplateRendererProvider: MailTemplateRendererProvider;
  private readonly mailQueue: Queue<unknown> | undefined;
  private readonly mailLogRepository: MailLogRepository | undefined;
  private readonly logger: Logger;

  constructor(
    mailClient: MailClient,
    @optional() mailTemplateProvider: MailTemplateProvider,
    mailTemplateRendererProvider: MailTemplateRendererProvider,
    // @inject(Queue) @resolveArgProvider(() => mailModuleConfig.queueKey) @optional() mailQueue: Queue<unknown> | undefined,
    @inject(MailLogRepository) @optional() mailLogRepository: MailLogRepository | undefined,
    @resolveArg<LoggerArgument>(MailService.name) logger: Logger
  ) {
    this.mailClient = mailClient;
    this.mailTemplateProvider = mailTemplateProvider;
    this.mailTemplateRendererProvider = mailTemplateRendererProvider;
    // this.mailQueue = mailQueue;
    this.mailLogRepository = mailLogRepository;
    this.logger = logger;
  }

  async sendTemplate(key: string, mailData: TypedOmit<MailData, 'content' | 'subject'>, templateContext?: object): Promise<MailSendResult> {
    const template = await this.mailTemplateProvider.get(key);
    const renderer = this.mailTemplateRendererProvider.get(template.type);
    const { subject, html, text } = await renderer.render(template, templateContext);

    const fullMailData = { ...mailData, subject, content: { html, text } };

    let mailLog: MailLog | undefined;

    if (isDefined(this.mailLogRepository)) {
      const log: NewMailLog = {
        timestamp: currentTimestamp(),
        templateKey: key,
        data: fullMailData
      };

      mailLog = await this.mailLogRepository.insert(log);
    }

    try {
      const result = await this.mailClient.send(fullMailData);

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
}
