import type { AfterResolve } from '#/container';
import { afterResolve, singleton } from '#/container';
import { disposer } from '#/core';
import type { AsyncDisposable } from '#/disposable/disposable';
import { disposeAsync } from '#/disposable/disposable';
import { Pool } from '#/pool';
import { TemplateService } from '#/templates';
import { isObject, isUndefined } from '#/utils/type-guards';
import * as puppeteer from 'puppeteer';

export type PdfRenderOptions = {
  omitDefaultBackground?: boolean,
  renderBackground?: boolean,
  landscape?: boolean,
  format?: 'letter' | 'legal' | 'tabloid' | 'ledger' | 'a0' | 'a1' | 'a2' | 'a3' | 'a4' | 'a5' | 'a6',
  width?: string | number,
  height?: string | number,
  scale?: number,
  margin?: string | number | {
    top?: number | string,
    bottom?: number | string,
    right?: number | string,
    left?: number | string
  },
  waitForNetworkIdle?: boolean
};

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

  async renderHtml(html: string, options?: PdfRenderOptions): Promise<Uint8Array> {
    return this.render(async (page) => page.setContent(html, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' }), options);
  }

  async renderUrl(url: string, options?: PdfRenderOptions): Promise<Uint8Array> {
    return this.render(async (page) => page.goto(url, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' }), options);
  }

  async renderTemplate(key: string, templateContext?: object, options?: PdfRenderOptions): Promise<Uint8Array> {
    const html = await this.templateService.render(key, templateContext);
    return this.renderHtml(html, options);
  }

  private async render(handler: (page: puppeteer.Page) => unknown, options?: PdfRenderOptions): Promise<Uint8Array> {
    return this.pool.use(async (browser) => {
      const page = await browser.newPage();

      try {
        await handler(page);

        const margin = isUndefined(options?.margin)
          ? undefined
          : isObject(options!.margin)
            ? options!.margin
            : {
              top: options!.margin,
              bottom: options!.margin,
              right: options!.margin,
              left: options!.margin
            };

        const result = await page.pdf({
          format: options?.format ?? 'a4',
          scale: options?.scale,
          landscape: options?.landscape,
          width: options?.width,
          height: options?.height,
          omitBackground: options?.omitDefaultBackground,
          printBackground: options?.renderBackground,
          margin
        });

        return result;
      }
      finally {
        await page.close();
      }
    });
  }
}
