import { container } from '#/container';
import { configureMail, MailService } from '#/mail';
import { NodemailerMailClient } from '#/mail/clients/nodemailer.mail-client';
import { configureFileMailTemplateProvider, FileMailTemplateProvider } from '#/mail/template-providers/file-mail-template.provider';
import { HandlebarsMailTemplateRenderer } from '#/mail/template-renderers/handlebars.mail-template-renderer';
import { MjmlMailTemplateRenderer } from '#/mail/template-renderers/mjml.mail-template-renderer';
import { integer, string } from '#/utils/config-parser';
import { resolve } from 'path';
import { configureTstdl } from '../../core';

configureTstdl();

configureMail({
  clientConfig: {
    host: string('HOST', '127.0.0.01'),
    port: integer('PORT', 25),
    auth: {
      user: string('USER', 'user'),
      password: string('PASS', 'password')
    }
  },
  client: NodemailerMailClient,
  templateProvider: FileMailTemplateProvider,
  templateRenderers: [MjmlMailTemplateRenderer, HandlebarsMailTemplateRenderer]
});

configureFileMailTemplateProvider({ basePath: resolve(__dirname.replace('/dist', '/source'), 'templates') });

async function test(): Promise<void> {
  const service = await container.resolveAsync(MailService);

  const result = await service.sendTemplate(
    'hello-name',
    { from: string('FROM', string('USER', 'user@example.com')), to: string('TO', 'user@example.com') },
    { name: 'Max Mustermann' }
  );

  console.log(result);
}

void test();
