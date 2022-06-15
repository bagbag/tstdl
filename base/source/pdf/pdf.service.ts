import type { AfterResolve } from '#/container';
import { afterResolve, singleton } from '#/container';
import { disposer } from '#/core';
import type { AsyncDisposable } from '#/disposable/disposable';
import { disposeAsync } from '#/disposable/disposable';
import { Pool } from '#/pool';
import { TemplateService } from '#/templates';
import * as puppeteer from 'puppeteer';

@singleton()
export class PdfService implements AsyncDisposable, AfterResolve {
  private readonly templateService: TemplateService;
  private readonly pool: Pool<puppeteer.Browser>;

  constructor(templateService: TemplateService) {
    this.templateService = templateService;

    this.pool = new Pool(
      async () => puppeteer.launch(),
      async (browser) => browser.close()
    );
  }

  [afterResolve](): void {
    disposer.add(this);
  }

  async [disposeAsync](): Promise<void> {
    return this.dispose();
  }

  async dispose(): Promise<void> {
    return this.pool.dispose();
  }

  async renderHtml(html: string): Promise<Uint8Array> {
    return this.render(async (page) => page.setContent(html, { waitUntil: 'networkidle2' }));
  }

  async renderUrl(url: string): Promise<Uint8Array> {
    return this.render(async (page) => page.goto(url, { waitUntil: 'networkidle2' }));
  }

  async renderTemplate(key: string, templateContext: object): Promise<Uint8Array> {
    const html = await this.templateService.render(key, templateContext);
    return this.renderHtml(html);
  }

  private async render(handler: (page: puppeteer.Page) => unknown): Promise<Uint8Array> {
    return this.pool.use(async (browser) => {
      const page = await browser.newPage();

      try {
        await handler(page);
        const result = await page.pdf({ format: 'a4' });
        return result;
      }
      finally {
        await page.close();
      }
    });
  }
}
