import { Application } from '#/application';
import { container } from '#/container';
import { configureTstdl } from '#/core';
import { configureTemplates, TemplateService } from '#/templates';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { JsxTemplateRenderer } from '#/templates/renderers/jsx.template-renderer';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver';
import { JsxTemplateResolver } from '#/templates/resolvers/jsx.template-resolver';
import { resolve } from 'path';

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
