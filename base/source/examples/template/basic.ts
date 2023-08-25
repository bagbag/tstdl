import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Application } from '#/application/application.js';
import { configureTstdl } from '#/core.js';
import { inject } from '#/injector/inject.js';
import { configureTemplates, TemplateService } from '#/templates/index.js';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { JsxTemplateRenderer } from '#/templates/renderers/jsx.template-renderer.js';
import { StringTemplateRenderer } from '#/templates/renderers/string.template-renderer.js';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';
import { JsxTemplateResolver } from '#/templates/resolvers/jsx.template-resolver.js';
import { StringTemplateResolver } from '#/templates/resolvers/string.template-resolver.js';

let dirname: string;

try {
  dirname = fileURLToPath(new URL('.', import.meta.url));
}
catch {
  dirname = __dirname;
}

configureTstdl();

configureTemplates({
  templateProvider: FileTemplateProvider,
  templateResolvers: [FileTemplateResolver, JsxTemplateResolver, StringTemplateResolver],
  templateRenderers: [HandlebarsTemplateRenderer, JsxTemplateRenderer, StringTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(dirname.replace('dist', 'source'), 'templates') });

async function test(): Promise<void> {
  const templateService = inject(TemplateService);
  const handlebarsResult = await templateService.render('hello-name', { name: 'Max Mustermann' });
  const jsxResult = await templateService.render('hello-jsx', { name: 'Max Mustermann' });

  console.log({
    handlebars: handlebarsResult.fields,
    jsx: jsxResult.fields
  });
}

Application.run(test);
