import { Application } from '#/application/application.js';
import { container } from '#/container/index.js';
import { configureTstdl } from '#/core.js';
import { configureTemplates, TemplateService } from '#/templates/index.js';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { JsxTemplateRenderer } from '#/templates/renderers/jsx.template-renderer.js';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';
import { JsxTemplateResolver } from '#/templates/resolvers/jsx.template-resolver.js';
import { resolve } from 'node:path';

configureTstdl();

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateResolvers: [FileTemplateResolver, JsxTemplateResolver],
  templateRenderers: [HandlebarsTemplateRenderer, JsxTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(__dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(__dirname.replace('dist', 'source'), 'templates') });

async function test(): Promise<void> {
  const templateService = await container.resolveAsync(TemplateService);
  const handlebarsResult = await templateService.render('hello-name', { name: 'Max Mustermann' });
  const jsxResult = await templateService.render('hello-jsx', { name: 'Max Mustermann' });

  console.log({
    handlebars: handlebarsResult.fields,
    jsx: jsxResult.fields
  });
}

Application.run(test);
