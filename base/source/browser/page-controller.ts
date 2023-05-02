import type { Page } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { timeout, withTimeout } from '#/utils/timing.js';
import { assertNotNull, isDefined, isNumber, isObject, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { BrowserContextController } from './browser-context-controller.js';
import type { PdfRenderOptions } from './pdf-options.js';

export type Delay = number | DelayProvider;
export type DelayProvider = () => number;

export type PageControllerOptions = {
  actionDelay?: Delay,
  typeDelay?: Delay
};

export type WaitOptions = {
  timeout?: number
};

export type LoadState = 'load' | 'domcontentloaded' | 'networkidle';

export type WaitForStateOptions = {
  waitUntil: LoadState
};

export type DelayOptions = {
  delay?: Delay
};

export type Abortable = {
  abort?: AbortSignal
};

/** @deprecated for internal use only */
export type PageControllerInternal = {
  ownedContext?: BrowserContextController
};

export class PageController implements AsyncDisposable {
  private readonly ownedContext?: BrowserContextController;

  /** @deprecated should be avoided */
  readonly page: Page;
  readonly options: PageControllerOptions;

  constructor(page: Page, options: PageControllerOptions = {}) {
    this.page = page;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    if (isDefined(this.ownedContext)) {
      await this.ownedContext.close();
    }
    else {
      await this.page.close();
    }
  }

  async setContent(html: string, options?: WaitOptions & WaitForStateOptions): Promise<void> {
    await this.page.setContent(html, { timeout: options?.timeout, waitUntil: options?.waitUntil });
  }

  async setExtraHttpHeaders(headers: Record<string, string>): Promise<void> {
    await this.page.setExtraHTTPHeaders(headers);
  }

  async navigate(url: string, options?: WaitOptions & WaitForStateOptions): Promise<void> {
    await this.page.goto(url, { timeout: options?.timeout, waitUntil: options?.waitUntil });
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

  async waitForState(state: LoadState, options?: WaitOptions): Promise<void> {
    await this.page.waitForLoadState(state, { timeout: options?.timeout });
  }

  async waitForNetworkIdle(options?: WaitOptions): Promise<void> {
    await this.page.waitForLoadState('networkidle', { timeout: options?.timeout });
  }

  async waitForUrl(urlOrPredicate: string | RegExp | ((url: URL) => boolean), options?: WaitOptions): Promise<void> {
    await this.page.waitForURL(urlOrPredicate, { timeout: options?.timeout });
  }

  async waitForFrame(selector: string, options?: WaitOptions): Promise<PageController> {
    const handle = await this.page.waitForSelector(selector, { timeout: options?.timeout });
    const frame = await handle.contentFrame();
    assertNotNull(frame, 'Could not get frame for specified selector.');

    return new PageController(frame.page());
  }

  async fill(selector: string, text: string, options?: DelayOptions & WaitOptions): Promise<void> {
    await this.prepareAction();

    const locator = this.page.locator(selector);
    await locator.fill(text, { timeout: options?.timeout });
  }

  async type(selector: string, text: string, options?: DelayOptions & WaitOptions): Promise<void> {
    await this.prepareAction();

    const locator = this.page.locator(selector);
    await locator.focus({ timeout: options?.timeout });

    if (isUndefined(this.options.typeDelay)) {
      await locator.type(text, { timeout: options?.timeout });
    }
    else {
      for (const char of text) {
        await locator.type(char, { timeout: options?.timeout });
        await delay(options?.delay ?? this.options.typeDelay);
      }
    }
  }

  async selectOption(selector: string, value: string | string[], options?: WaitOptions): Promise<void> {
    await this.prepareAction();

    const locator = this.page.locator(selector);
    await locator.selectOption(value, { timeout: options?.timeout });
  }

  async click(selector: string, options?: WaitOptions): Promise<void> {
    await this.prepareAction();

    const locator = this.page.locator(selector);
    await locator.click({ delay: 50, timeout: options?.timeout });
  }

  async getValue(selector: string, options?: WaitOptions): Promise<string> {
    const locator = this.page.locator(selector);
    return locator.inputValue({ timeout: options?.timeout });
  }

  async waitForElement(selector: string, options?: WaitOptions): Promise<void> {
    const locator = this.page.locator(selector);
    return locator.waitFor({ timeout: options?.timeout });
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

  private async prepareAction(): Promise<void> {
    await delay(this.options.actionDelay);
    await this.waitForNetworkIdle();
  }
}

async function delay(milliseconds: Delay | undefined): Promise<void> {
  if (isUndefined(milliseconds)) {
    return;
  }

  if (isNumber(milliseconds)) {
    await timeout(milliseconds);
  }
  else {
    await timeout(milliseconds());
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
