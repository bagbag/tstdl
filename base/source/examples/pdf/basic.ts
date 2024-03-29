import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Application } from '#/application/application.js';
import { BrowserService } from '#/browser/browser.service.js';
import { configureTstdl } from '#/core.js';
import { inject } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import { PdfService } from '#/pdf/pdf.service.js';
import { configureTemplates } from '#/templates/module.js';
import { FileTemplateProvider, configureFileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer.js';
import { StringTemplateRenderer } from '#/templates/renderers/string.template-renderer.js';
import { FileTemplateResolver, configureFileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';
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
  templateResolvers: [FileTemplateResolver, StringTemplateResolver],
  templateRenderers: [MjmlTemplateRenderer, HandlebarsTemplateRenderer, StringTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(dirname.replace('dist', 'source'), 'templates') });

async function main(): Promise<void> {
  const injector = inject(Injector);
  const browserService = await injector.resolveAsync(BrowserService);
  const pdfService = await injector.resolveAsync(PdfService);

  const [result1, result2] = await Promise.all([
    pdfService.renderTemplate('hello-name', { name: 'Max Mustermann' }),
    pdfService.renderUrl('https://google.de')
  ]);

  console.log(`Resulting PDFs have ${result1.length} and ${result2.length} bytes.`);

  writeFileSync('/tmp/template.pdf', result1);
  writeFileSync('/tmp/page.pdf', result2);

  const browser = await browserService.newBrowser({ headless: false });
  const context = await browser.newContext();

  const page1 = await context.newPage();
  const page2 = await context.newPage();

  await Promise.all([
    page1.navigate('file:///tmp/template.pdf'),
    page2.navigate('file:///tmp/page.pdf')
  ]);

  await page1.waitForClose();
  await page2.waitForClose();
}

Application.run(main);
