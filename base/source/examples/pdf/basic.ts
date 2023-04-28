import { writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { Application } from '#/application/application.js';
import { BrowserService } from '#/browser/browser.service.js';
import { container } from '#/container/index.js';
import { configureTstdl } from '#/core.js';
import { PdfService } from '#/pdf/pdf.service.js';
import { configureTemplates } from '#/templates/module.js';
import { configureFileTemplateProvider, FileTemplateProvider } from '#/templates/providers/file.template-provider.js';
import { HandlebarsTemplateRenderer } from '#/templates/renderers/handlebars.template-renderer.js';
import { MjmlTemplateRenderer } from '#/templates/renderers/mjml.template-renderer.js';
import { configureFileTemplateResolver, FileTemplateResolver } from '#/templates/resolvers/file.template-resolver.js';

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
  templateResolvers: [FileTemplateResolver],
  templateRenderers: [MjmlTemplateRenderer, HandlebarsTemplateRenderer]
});

configureFileTemplateProvider({ basePath: resolve(dirname, 'templates') });
configureFileTemplateResolver({ basePath: resolve(dirname.replace('dist', 'source'), 'templates') });

async function main(): Promise<void> {
  const browserService = await container.resolveAsync(BrowserService);
  const pdfService = await container.resolveAsync(PdfService);
  const result1 = await pdfService.renderTemplate('hello-name', { name: 'Max Mustermann' });
  const result2 = await pdfService.renderUrl('https://google.de');

  console.log(`Resulting PDFs have ${result1.length} and ${result2.length} bytes.`);

  writeFileSync('/tmp/template.pdf', result1);
  writeFileSync('/tmp/page.pdf', result2);

  const browser = await browserService.newBrowser();

  const page1 = await browser.newPage();
  const page2 = await browser.newPage();

  await Promise.all([
    page1.navigate('file:///tmp/template.pdf'),
    page2.navigate('file:///tmp/page.pdf')
  ]);

  await browser.waitForClose();
}

Application.run(main);
