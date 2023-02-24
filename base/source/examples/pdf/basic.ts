import { Application } from '#/application/application.js';
import { container } from '#/container/index.js';
import { configureTstdl } from '#/core.js';
import { PdfService } from '#/pdf/pdf.service.js';
import { configureTemplates } from '#/templates/module.js';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer.js';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';
import { resolve } from 'node:path';

configureTstdl();

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateResolvers: [FileTemplateResolver],
  templateRenderers: [MjmlTemplateRenderer, HandlebarsTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(__dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(__dirname.replace('dist', 'source'), 'templates') });

async function test(): Promise<void> {
  const pdfService = await container.resolveAsync(PdfService);
  const result = await pdfService.renderTemplate('hello-name', { name: 'Max Mustermann' });

  console.log(`Resulting PDF has ${result.length} bytes.`);
}

Application.run(test);
