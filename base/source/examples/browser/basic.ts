import '#/polyfills.js';

import { writeFile } from 'node:fs/promises';

import { Application } from '#/application/index.js';
import { BrowserService } from '#/browser/browser.service.js';
import { inject, injectAsync } from '#/injector/inject.js';
import { Logger } from '#/logger/logger.js';
import { timeout } from '#/utils/timing.js';

async function main(): Promise<void> {
  const logger = inject(Logger).subModule('BROWSER');
  const browserService = await injectAsync(BrowserService);
  const browser = await browserService.newBrowser({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.attachLogger(logger);

  await page.navigate('https://google.com');
  await page.getBySelector('//div[text() = \'Alle ablehnen\']').click();

  await timeout(1000);
  const pdf = await page.renderPdf();

  await writeFile('/tmp/pdf.pdf', pdf);

  await page.navigate('file:///tmp/pdf.pdf');
  await page.waitForClose();
}

Application.run(main);
