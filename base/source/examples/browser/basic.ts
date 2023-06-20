import { writeFileSync } from 'node:fs';

import { Application } from '#/application/index.js';
import { BrowserService } from '#/browser/browser.service.js';
import { container } from '#/container/container.js';
import { Logger } from '#/logger/logger.js';
import { timeout } from '#/utils/timing.js';

async function main(): Promise<void> {
  const browserService = await container.resolveAsync(BrowserService);
  const browser = await browserService.newBrowser({ headless: false });
  const context = await browser.newContext();
  const page = await context.newPage();
  const logger = container.resolve(Logger).subModule('BROWSER');

  page.attachLogger(logger);

  await page.navigate('https://google.com');
  await page.getBySelector('//div[text() = \'Alle ablehnen\']').click();

  await timeout(1000);
  const pdf = await page.renderPdf();

  writeFileSync('/tmp/pdf.pdf', pdf);

  await page.navigate('file:///tmp/pdf.pdf');
  await page.waitForClose();
}

Application.run(main);
