import type SMTPTransport = require('nodemailer/lib/smtp-transport'); // eslint-disable-line @typescript-eslint/no-require-imports
import type { Transporter } from 'nodemailer';
import { createTransport } from 'nodemailer';

import type { Disposable } from '#/disposable/disposable.js';
import { Singleton, inject, injectArgument } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import type { WritableOneOrMany } from '#/types/index.js';
import { assertDefined, isUndefined } from '#/utils/type-guards.js';
import { MailClient, MailClientConfig } from '../mail.client.js';
import type { MailAddress, MailData, MailSendResult } from '../models/index.js';

@Singleton()
export class NodemailerMailClient extends MailClient implements Disposable {
  readonly #stack = new DisposableStack();
  readonly #transports = new Map<string, Transporter<SMTPTransport.SentMessageInfo>>();
  readonly #defaultClientConfig = injectArgument(this, { optional: true }) ?? inject(MailClientConfig, undefined, { optional: true });

  [Symbol.dispose](): void {
    this.#stack.dispose();
  }

  async send(data: MailData, clientConfig?: MailClientConfig): Promise<MailSendResult> {
    const config = clientConfig ?? this.#defaultClientConfig;
    assertDefined(config, 'No mail client config provided.');

    const transport = this.getTransport(config);

    const result = await transport.sendMail({
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

  private getTransport(config: MailClientConfig): Transporter<SMTPTransport.SentMessageInfo> {
    const options = convertConfig(config);
    const optionsJson = JSON.stringify(options);

    if (this.#transports.has(optionsJson)) {
      return this.#transports.get(optionsJson)!;
    }

    const transport = createTransport(options);
    this.#transports.set(optionsJson, transport);

    this.#stack.adopt(transport, () => transport.close());

    return transport;
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
    Injector.registerSingleton(NodemailerMailClient, { useToken: MailClient });
  }
}
