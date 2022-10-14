import { Application } from '#/application';
import { container } from '#/container';
import { configureTstdl } from '#/core';
import { configureTemplates, TemplateService } from '#/templates';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.provider-template';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver';
import { resolve } from 'path';

configureTstdl();

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateResolvers: [FileTemplateResolver],
  templateRenderers: [HandlebarsTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(__dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(__dirname.replace('dist', 'source'), 'templates') });

async function test(): Promise<void> {
  const templateService = await container.resolveAsync(TemplateService);
  const result = await templateService.render('hello-name', { name: 'Max Mustermann' });

  console.log(result.fields);
}

Application.run(test);
