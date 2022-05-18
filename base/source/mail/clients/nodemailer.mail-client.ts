import { container, inject, injectArg, singleton } from '#/container';
import type { WritableOneOrMany } from '#/types';
import { isUndefined } from '#/utils/type-guards';
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';
import { MailClient, MailClientConfig } from '../mail.client';
import type { MailAddress, MailData, MailSendResult } from '../models';
import { MAIL_CLIENT_CONFIG } from '../tokens';
import type SMTPTransport = require('nodemailer/lib/smtp-transport'); // eslint-disable-line @typescript-eslint/no-require-imports

@singleton()
export class NodemailerMailClient extends MailClient {
  private readonly transporter: Transporter<SMTPTransport.SentMessageInfo>;

  constructor(@inject(MAIL_CLIENT_CONFIG) @injectArg() config: MailClientConfig) {
    super();

    const options = convertConfig(config);
    this.transporter = createTransport(options);
  }

  async send(data: MailData): Promise<MailSendResult> {
    const result = await this.transporter.sendMail({
      from: data.from,
      sender: data.sender,
      to: data.to as WritableOneOrMany<MailAddress>,
      cc: data.cc as WritableOneOrMany<MailAddress>,
      bcc: data.bcc as WritableOneOrMany<MailAddress>,
      replyTo: data.replyTo,
      inReplyTo: data.inReplyTo,
      references: data.references as WritableOneOrMany<string>,
      subject: data.subject,
      text: data.content.text,
      html: data.content.html,
      headers: data.headers
    });

    return {
      messageId: result.messageId,
      accepted: result.accepted,
      rejected: result.rejected,
      pending: result.pending
    };
  }
}

function convertConfig(config: MailClientConfig): SMTPTransport.Options {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure ?? (config.port == 465),
    auth: isUndefined(config.auth) ? undefined : {
      type: 'login',
      user: config.auth.user,
      pass: config.auth.password
    }
  };
}

/**
 * @param register whether to register for {@link MailClient}
 */
export function configureNodemailerMailClient(register: boolean = true): void {
  if (register) {
    container.register(NodemailerMailClient, { useToken: MailClient });
  }
}
