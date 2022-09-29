import { Application } from '#/application';
import { container } from '#/container';
import { configureTstdl } from '#/core';
import { PdfService } from '#/pdf/pdf.service';
import { configureTemplates } from '#/templates';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.provider-template';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver';
import { resolve } from 'path';

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
