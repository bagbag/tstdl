import type { Page } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { NonUndefinable, SimplifyObject } from '#/types.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { withTimeout } from '#/utils/timing.js';
import { isDefined, isObject, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { Delay, ElementControllerOptions } from './element-controller.js';
import { ElementController } from './element-controller.js';
import type { PdfRenderOptions } from './pdf-options.js';
import type { Abortable } from './types.js';

export type PageControllerOptions = {
  defaultActionDelay?: Delay,
  defaultTypeDelay?: Delay
};

export class PageController implements AsyncDisposable {
  private readonly elementControllerOptions: ElementControllerOptions;

  /** @deprecated should be avoided */
  readonly page: Page;
  readonly options: PageControllerOptions;

  constructor(page: Page, options: PageControllerOptions = {}) {
    this.page = page;
    this.options = options;

    this.elementControllerOptions = { actionDelay: this.options.defaultActionDelay, typeDelay: this.options.defaultTypeDelay };
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.page.close();
  }

  async setContent(...args: Parameters<Page['setContent']>): Promise<void> {
    await this.page.setContent(...args);
  }

  async setExtraHttpHeaders(headers: Record<string, string>): Promise<void> {
    await this.page.setExtraHTTPHeaders(headers);
  }

  async navigate(...args: Parameters<Page['goto']>): Promise<void> {
    await this.page.goto(...args);
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => {
      if (this.page.isClosed()) {
        resolve();
        return;
      }

      this.page.once('close', () => resolve());
    });
  }

  async waitForLoadState(...args: Parameters<Page['waitForLoadState']>): Promise<void> {
    await this.page.waitForLoadState(...args);
  }

  async waitForUrl(...args: Parameters<Page['waitForURL']>): Promise<void> {
    await this.page.waitForURL(...args);
  }

  getBySelector(selector: string, options?: SimplifyObject<Pick<NonUndefinable<Parameters<Page['locator']>[1]>, 'hasText' | 'hasNotText'>>): ElementController {
    const locator = this.page.locator(selector, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): ElementController {
    const locator = this.page.getByRole(role, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByLabel(text: Parameters<Page['getByLabel']>[0], options?: Parameters<Page['getByLabel']>[1]): ElementController {
    const locator = this.page.getByLabel(text, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByAltText(text: Parameters<Page['getByAltText']>[0], options?: Parameters<Page['getByAltText']>[1]): ElementController {
    const locator = this.page.getByAltText(text, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByPlaceholder(text: Parameters<Page['getByPlaceholder']>[0], options?: Parameters<Page['getByPlaceholder']>[1]): ElementController {
    const locator = this.page.getByPlaceholder(text, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByText(text: Parameters<Page['getByText']>[0], options?: Parameters<Page['getByText']>[1]): ElementController {
    const locator = this.page.getByText(text, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  getByTitle(text: Parameters<Page['getByTitle']>[0], options?: Parameters<Page['getByTitle']>[1]): ElementController {
    const locator = this.page.getByTitle(text, options);
    return new ElementController(locator, this, this.elementControllerOptions);
  }

  async renderPdf(options: PdfRenderOptions & Abortable = {}): Promise<Uint8Array> {
    const createPdfOptions = convertPdfOptions(options);
    return withTimeout(options.timeout ?? 30 * millisecondsPerSecond, this.page.pdf(createPdfOptions), { errorMessage: 'Rendering pdf timed out.' });
  }

  renderPdfStream(options: PdfRenderOptions & Abortable = {}): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const buffer = await this.renderPdf(options);

      return new ReadableStream({
        pull(controller) {
          controller.enqueue(buffer);
          controller.close();
        }
      });
    });
  }
}

function convertPdfOptions(options: PdfRenderOptions): Parameters<Page['pdf']>[0] {
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
    printBackground: options.renderBackground,
    margin,
    displayHeaderFooter: options.displayHeaderFooter ?? (isDefined(options.headerTemplate) || isDefined(options.footerTemplate)),
    headerTemplate: options.headerTemplate,
    footerTemplate: options.footerTemplate
  };
}
