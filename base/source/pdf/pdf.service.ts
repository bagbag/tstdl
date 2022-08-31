import type { AfterResolve } from '#/container';
import { afterResolve, singleton } from '#/container';
import { disposer } from '#/core';
import type { AsyncDisposable } from '#/disposable/disposable';
import { disposeAsync } from '#/disposable/disposable';
import { Pool } from '#/pool';
import { Enumeration, Optional } from '#/schema';
import type { TemplateField } from '#/templates';
import { Template, TemplateService } from '#/templates';
import { isObject, isUndefined } from '#/utils/type-guards';
import * as puppeteer from 'puppeteer';

export enum PdfFormat {
  Letter = 'letter',
  Legal = 'legal',
  Tabloid = 'tabloid',
  Ledger = 'ledger',
  A0 = 'a0',
  A1 = 'a1',
  A2 = 'a2',
  A3 = 'a3',
  A4 = 'a4',
  A5 = 'a5',
  A6 = 'a6'
}

export class PdfMarginObject {
  @Optional([Number, String])
  top?: number | string;

  @Optional([Number, String])
  bottom?: number | string;

  @Optional([Number, String])
  right?: number | string;

  @Optional([Number, String])
  left?: number | string;
}

export class PdfRenderOptions {
  @Optional()
  omitDefaultBackground?: boolean;

  @Optional()
  renderBackground?: boolean;

  @Optional()
  landscape?: boolean;

  @Optional()
  @Enumeration(PdfFormat)
  format?: PdfFormat;

  @Optional([String, Number])
  width?: string | number;

  @Optional([String, Number])
  height?: string | number;

  @Optional()
  scale?: number;

  @Optional([String, Number, PdfMarginObject])
  margin?: string | number | PdfMarginObject;

  @Optional()
  displayHeaderFooter?: boolean;

  @Optional()
  waitForNetworkIdle?: boolean;

  @Optional()
  headerTemplate?: string;

  @Optional()
  footerTemplate?: string;
}

export type PdfTemplateOptions = PdfRenderOptions;

export class PdfTemplate extends Template<{ header: false, body: true, footer: false }, PdfRenderOptions> {
  @Optional()
  override options?: PdfTemplateOptions;
}

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

  /**
   * renders a pdf template
   * @param key template key
   * @param templateContext context for template rendering
   * @param options additional options, overwrites options specified in template
   * @returns PDF bytes
   */
  async renderTemplate(key: string, templateContext?: object, options?: PdfRenderOptions): Promise<Uint8Array> {
    const { fields: { header, body, footer }, options: optionsFromTemplate } = await this.templateService.render<PdfTemplate>(key, templateContext);
    return this.renderHtml(body, { ...optionsFromTemplate, headerTemplate: header, footerTemplate: footer, ...options });
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
          margin,
          displayHeaderFooter: options?.displayHeaderFooter,
          headerTemplate: '',
          footerTemplate: ''
        });

        return result;
      }
      finally {
        await page.close();
      }
    });
  }
}

export function pdfTemplate(fields: { body: TemplateField, header?: TemplateField, footer?: TemplateField }, options?: PdfTemplateOptions): PdfTemplate {
  return {
    fields,
    options
  };
}
