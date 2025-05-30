/**
 * PDF generation
 *
 * @module PDF
 */

import { BrowserContextController } from '#/browser/browser-context-controller.js';
import type { BrowserControllerArgument } from '#/browser/browser-controller.js';
import { BrowserController } from '#/browser/browser-controller.js';
import type { PageController } from '#/browser/page-controller.js';
import { PdfRenderOptions } from '#/browser/pdf-options.js';
import type { Resolvable } from '#/injector/index.js';
import { Singleton, inject, injectArgument, resolveArgumentType } from '#/injector/index.js';
import { LogLevel } from '#/logger/level.js';
import { Logger } from '#/logger/logger.js';
import { Optional } from '#/schema/index.js';
import type { TemplateField } from '#/templates/index.js';
import { Template, TemplateService } from '#/templates/index.js';
import { finalizeStream } from '#/utils/stream/finalize-stream.js';
import { readableStreamFromPromise } from '#/utils/stream/from-promise.js';
import { readBinaryStream } from '#/utils/stream/stream-reader.js';
import { timeout } from '#/utils/timing.js';
import { isDefined } from '#/utils/type-guards.js';

export class PdfServiceRenderOptions extends PdfRenderOptions {
  @Optional()
  browserContext?: BrowserContextController;

  @Optional()
  locale?: string;

  /**
   * @default true
   */
  @Optional()
  waitForNetworkIdle?: boolean;

  /**
   * Delay pdf creation to ensure content has finished rendering
   * @default 50
   */
  @Optional()
  delay?: number;

  /**
   * @default false
   */
  @Optional()
  log?: boolean | LogLevel;
}

export type PdfTemplateOptions = PdfRenderOptions;

export class PdfTemplate<Context extends object = any> extends Template<{ header: false, body: true, footer: false }, PdfRenderOptions, Context> {
  @Optional()
  declare options?: PdfTemplateOptions;
}

export type PdfServiceOptions = {
  locale?: string
};

export type PdfServiceArgument = PdfServiceOptions & {
  browserControllerArgument: BrowserControllerArgument
};

const browserArguments = ['--font-render-hinting=none', '--disable-web-security', '--disable-features=IsolateOrigins', '--disable-site-isolation-trials'];

@Singleton()
export class PdfService implements Resolvable<PdfServiceArgument> {
  private readonly templateService = inject(TemplateService);
  private readonly browserController = inject(BrowserController, injectArgument(this, { optional: true })?.browserControllerArgument ?? { browserArguments });
  private readonly logger = inject(Logger, 'PdfService');

  private readonly defaultLocale = injectArgument(this, { optional: true })?.locale;

  declare readonly [resolveArgumentType]: PdfServiceArgument;

  /**
   * Renders HTML to pdf stream
   * @param html html to render
   * @param options render options
   * @returns pdf stream
   */
  renderHtmlStream(html: string, options?: PdfServiceRenderOptions): ReadableStream<Uint8Array> {
    return this.renderStream(async (page) => page.setContent(html), options);
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
      await controller.navigate(url);
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
      await page.setContent(body);

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
      const context = options.browserContext ?? await this.browserController.newContext({ locale: options.locale ?? this.defaultLocale });
      const page = await context.newPage();

      if (isDefined(options.log) && (options.log != false)) {
        const level = (options.log == true) ? LogLevel.Trace : options.log;
        const logger = this.logger.fork({ level, subModule: 'PAGE' });

        page.attachLogger(logger);
      }

      const optionsFromHandler = await handler(page);

      if (options.waitForNetworkIdle != false) {
        await page.waitForLoadState('networkidle');
      }

      await timeout(options.delay ?? 50);

      const pdfStream = page.renderPdfStream({ ...optionsFromHandler, ...options });

      const close = async (): Promise<void> => {
        if (isDefined(options.browserContext)) {
          await page.close();
        }
        else {
          await context.close();
        }
      };

      return finalizeStream(pdfStream, {
        beforeDone: close,
        beforeCancel: close,
        error: close
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
