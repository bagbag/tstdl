import { container } from '#/container/index.js';
import { NodemailerMailClient } from '#/mail/clients/nodemailer.mail-client.js';
import { configureMail, MailService } from '#/mail/index.js';
import { configureTemplates } from '#/templates/index.js';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer.js';
import { configureFileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';
import { integer, string } from '#/utils/config-parser.js';
import { resolve } from 'node:path';
import { configureTstdl } from '../../core.js';

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
