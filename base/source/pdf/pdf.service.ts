import type { BrowserController } from '#/browser/browser-controller.js';
import { BrowserService } from '#/browser/browser.service.js';
import type { PageController } from '#/browser/page-controller.js';
import { PdfRenderOptions } from '#/browser/pdf-options.js';
import type { AfterResolve, Injectable } from '#/container/index.js';
import { afterResolve, injectArg, resolveArg, singleton, type resolveArgumentType } from '#/container/index.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { Pool } from '#/pool/pool.js';
import { Optional } from '#/schema/index.js';
import type { TemplateField } from '#/templates/index.js';
import { Template, TemplateService } from '#/templates/index.js';
import { finalizeStream } from '#/utils/stream/finalize-stream.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { isDefined } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';

export class PdfServiceRenderOptions extends PdfRenderOptions {
  @Optional()
  language?: string;

  @Optional()
  waitForNetworkIdle?: boolean;

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

const browserArguments = ['--font-render-hinting=none', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'];

@singleton()
export class PdfService implements AsyncDisposable, AfterResolve, Injectable<PdfServiceArgument> {
  private readonly templateService: TemplateService;
  private readonly logger: Logger;
  private readonly pool: Pool<BrowserController>;

  declare readonly [resolveArgumentType]: PdfServiceArgument;
  constructor(templateService: TemplateService, browserService: BrowserService, @resolveArg<LoggerArgument>('PdfService') logger: Logger, @injectArg() options: PdfServiceOptions = {}) {
    this.templateService = templateService;
    this.logger = logger;

    this.pool = new Pool(
      async () => browserService.newBrowser({ headless: true, language: options.language, browserArguments }),
      async (controller) => controller.close(),
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
  renderHtmlStream(html: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => page.setContent(html, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' }), options);
  }

  /**
   * Renders HTML to pdf
   * @param html html to render
   * @param options render options
   * @returns pdf bytes
   */
  async renderHtml(html: string, options?: PdfServiceRenderOptions): Promise<Uint8Array> {
    const stream = this.renderHtmlStream(html, options);
    return readBinaryStream(stream);
  }

  /**
   * Renders an url to pdf stream
   * @param url url to load and render
   * @param options render options
   * @returns pdf stream
   */
  renderUrlStream(url: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (controller) => {
      await controller.navigate(url, { waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' });
    }, options);
  }

  /**
   * Renders an url to pdf
   * @param url url to load and render
   * @param options render options
   * @returns pdf bytes
   */
  async renderUrl(url: string, options?: PdfServiceRenderOptions): Promise<Uint8Array> {
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
  renderTemplateStream<Context extends object>(keyOrTemplate: string | PdfTemplate<Context>, templateContext?: Context, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => {
      const { fields: { header, body, footer }, options: optionsFromTemplate } = await this.templateService.render(keyOrTemplate, templateContext);
      await page.setContent(body, { timeout: options?.timeout, waitUntil: (options?.waitForNetworkIdle == true) ? 'networkidle2' : 'load' });

      return { ...optionsFromTemplate, headerTemplate: header, footerTemplate: footer };
    }, options);
  }

  /**
   * Renders a template to pdf
   * @param key template key
   * @param templateContext context for template rendering
   * @param options additional options, overwrites options specified in template
   * @returns pdf bytes
   */
  async renderTemplate(keyOrTemplate: string | PdfTemplate, templateContext?: object, options?: PdfServiceRenderOptions): Promise<Uint8Array> {
    const stream = this.renderTemplateStream(keyOrTemplate, templateContext, options);
    return readBinaryStream(stream);
  }

  private renderStream(handler: (page: PageController) => Promise<PdfServiceRenderOptions | undefined | void>, options: PdfServiceRenderOptions = {}): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const browserController = await this.pool.get();

      let page: PageController;

      try {
        page = await browserController.newPage();
      }
      catch (error) {
        await this.pool.disposeInstance(browserController);
        throw error;
      }

      if (isDefined(options.language)) {
        await page.setExtraHttpHeaders({ 'Accept-Language': options.language });
      }

      const optionsFromHandler = await handler(page);
      const pdfStream = page.renderPdfStream({ ...optionsFromHandler, ...options });
      const timeoutRef = setTimeout(() => void pdfStream.cancel(new Error('Pdf render timed out.')), (options.timeout ?? millisecondsPerMinute));

      const close = async (): Promise<void> => {
        try {
          clearTimeout(timeoutRef);
          await page.close();
        }
        catch (error) {
          await this.pool.disposeInstance(browserController);
          this.logger.error(error as Error);
        }
      };

      return finalizeStream(pdfStream, {
        beforeDone: close,
        beforeCancel: close,
        error: async () => {
          clearTimeout(timeoutRef);
          await this.pool.disposeInstance(browserController);
        }
      });
    });
  }
}


export function pdfTemplate(name: string, fields: { body: TemplateField, header?: TemplateField, footer?: TemplateField }, options?: PdfTemplateOptions): PdfTemplate {
  return {
    name,
    fields,
    options
  };
}
