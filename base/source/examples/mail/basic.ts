import { container } from '#/container';
import { configureMail, MailService } from '#/mail';
import { NodemailerMailClient } from '#/mail/clients/nodemailer.mail-client';
import { configureTemplates } from '#/templates';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.provider-template';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver';
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
  client: NodemailerMailClient
});

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateRenderers: [MjmlTemplateRenderer, HandlebarsTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(__dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(__dirname.replace('/dist', '/source'), 'templates') });

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
