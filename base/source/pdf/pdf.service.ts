import type { AfterResolve, Injectable } from '#/container/index.js';
import { afterResolve, injectArg, resolveArg, singleton, type resolveArgumentType } from '#/container/index.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { Pool } from '#/pool/pool.js';
import { Enumeration, Optional } from '#/schema/index.js';
import type { TemplateField } from '#/templates/index.js';
import { Template, TemplateService } from '#/templates/index.js';
import type { Record } from '#/types.js';
import { finalizeStream } from '#/utils/stream/finalize-stream.js';
import { getReadableStreamFromIterable } from '#/utils/stream/readable-stream-adapter.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { isDefined, isObject, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
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
  language?: string;

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

  /**
   * Timeout for closing render context in case something went wrong.
   * @default 60000 (1 minute)
   */
  @Optional()
  timeout?: number;
}

export type PdfTemplateOptions = PdfRenderOptions;

export class PdfTemplate<Context extends object = any> extends Template<{ header: false, body: true, footer: false }, PdfRenderOptions, Context> {
  @Optional()
  declare options?: PdfTemplateOptions;
}

export type PdfServiceOptions = {
  language?: string
};

export type PdfServiceArgument = PdfServiceOptions;

@singleton()
export class PdfService implements AsyncDisposable, AfterResolve, Injectable<PdfServiceArgument> {
  private readonly templateService: TemplateService;
  private readonly logger: Logger;
  private readonly pool: Pool<puppeteer.Browser>;
  private readonly options: PdfServiceOptions;


  declare readonly [resolveArgumentType]: PdfServiceArgument;

  constructor(templateService: TemplateService, @resolveArg<LoggerArgument>('PdfService') logger: Logger, @injectArg() options: PdfServiceOptions = {}) {
    this.templateService = templateService;
    this.logger = logger;
    this.options = options;

    const args = ['--font-render-hinting=none', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'];
    const env: Record<string, string> = {};

    if (isDefined(options.language)) {
      args.push(`--lang=${options.language}`);
      env['LANGUAGE'] = options.language;
    }

    this.pool = new Pool(
      async () => puppeteer.launch({ headless: true, args, env }),
      async (browser) => browser.close(),
      logger
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

  /**
   * Renders HTML to pdf stream
   * @param html html to render
   * @param options render options
   * @returns pdf stream
   */
  renderHtmlStream(html: string, options?: PdfRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => page.setContent(html, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' }), options);
  }

  /**
   * Renders HTML to pdf
   * @param html html to render
   * @param options render options
   * @returns pdf bytes
   */
  async renderHtml(html: string, options?: PdfRenderOptions): Promise<Uint8Array> {
    const stream = this.renderHtmlStream(html, options);
    return readBinaryStream(stream);
  }

  /**
   * Renders an url to pdf stream
   * @param url url to load and render
   * @param options render options
   * @returns pdf stream
   */
  renderUrlStream(url: string, options?: PdfRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => {
      await page.goto(url, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' });
    }, options);
  }

  /**
   * Renders an url to pdf
   * @param url url to load and render
   * @param options render options
   * @returns pdf bytes
   */
  async renderUrl(url: string, options?: PdfRenderOptions): Promise<Uint8Array> {
    const stream = this.renderUrlStream(url, options);
    return readBinaryStream(stream);
  }

  /**
   * Renders a template to pdf
   * @param key template key
   * @param templateContext context for template rendering
   * @param options additional options, overwrites options specified in template
   * @returns pdf bytes
   */
  renderTemplateStream<Context extends object>(keyOrTemplate: string | PdfTemplate<Context>, templateContext?: Context, options?: PdfRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => {
      const { fields: { header, body, footer }, options: optionsFromTemplate } = await this.templateService.render(keyOrTemplate, templateContext);
      await page.setContent(body, { ...optionsFromTemplate, headerTemplate: header, footerTemplate: footer, waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load', ...options });

      return { ...optionsFromTemplate, headerTemplate: header, footerTemplate: footer, ...options };
    }, options);
  }

  /**
   * Renders a template to pdf
   * @param key template key
   * @param templateContext context for template rendering
   * @param options additional options, overwrites options specified in template
   * @returns pdf bytes
   */
  async renderTemplate(keyOrTemplate: string | PdfTemplate, templateContext?: object, options?: PdfRenderOptions): Promise<Uint8Array> {
    const stream = this.renderTemplateStream(keyOrTemplate, templateContext, options);
    return readBinaryStream(stream);
  }

  private renderStream(handler: (page: puppeteer.Page) => Promise<PdfRenderOptions | undefined | void>, options: PdfRenderOptions = {}): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const browser = await this.pool.get();

      try {
        let page: puppeteer.Page;

        try {
          page = await browser.newPage();
        }
        catch (error) {
          await this.pool.disposeInstance(browser);
          throw error;
        }

        if (isDefined(options.language)) {
          await page.setExtraHTTPHeaders({ 'Accept-Language': options.language });
        }

        const timeoutRef = setTimeout(() => void page.close().catch((error) => this.logger.error(error as Error)), (options.timeout ?? millisecondsPerMinute));

        const optionsFromHandler = await handler(page) ?? {};

        const mergedOptions: PdfRenderOptions = { ...optionsFromHandler, ...options };
        const createPdfOptions: puppeteer.PDFOptions = this.convertOptions(mergedOptions);
        const pdfStream = await page.createPDFStream(createPdfOptions);

        return finalizeStream(getReadableStreamFromIterable<Uint8Array>(pdfStream), async () => {
          clearTimeout(timeoutRef);

          try {
            await page.close();
          }
          catch (error) {
            this.logger.error(error as Error);
            throw error;
          }
          finally {
            await this.pool.release(browser);
          }
        });
      }
      catch (error) {
        await this.pool.release(browser);
        throw error;
      }
    });
  }

  private convertOptions(options: PdfRenderOptions): puppeteer.PDFOptions {
    const margin = isUndefined(options.margin)
      ? undefined
      : isObject(options.margin)
        ? options.margin
        : {
          top: options.margin,
          bottom: options.margin,
          right: options.margin,
          left: options.margin
        };

    return {
      format: options.format ?? 'a4',
      scale: options.scale,
      landscape: options.landscape,
      width: options.width,
      height: options.height,
      omitBackground: options.omitDefaultBackground,
      printBackground: options.renderBackground,
      margin,
      displayHeaderFooter: options.displayHeaderFooter ?? (isDefined(options.headerTemplate) || isDefined(options.footerTemplate)),
      headerTemplate: options.headerTemplate,
      footerTemplate: options.footerTemplate
    };
  }
}

export function pdfTemplate(name: string, fields: { body: TemplateField, header?: TemplateField, footer?: TemplateField }, options?: PdfTemplateOptions): PdfTemplate {
  return {
    name,
    fields,
    options
  };
}
