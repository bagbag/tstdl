import { writeFileSync } from 'node:fs';

import { Application } from '#/application/index.js';
import { BrowserService } from '#/browser/browser.service.js';
import { container } from '#/container/container.js';
import { timeout } from '#/utils/timing.js';

async function main(): Promise<void> {
  const browserService = await container.resolveAsync(BrowserService);
  const browser = await browserService.newBrowser();
  const page = await browser.newPage();

  await page.navigate('https://google.com');
  await page.click('//div[text() = \'Alle ablehnen\']', { xpath: true });

  await timeout(1000);
  const pdf = await page.renderPdf();

  writeFileSync('/tmp/pdf.pdf', pdf);

  await page.navigate('file:///tmp/pdf.pdf');
  await browser.waitForClose();
}

Application.run(main);
