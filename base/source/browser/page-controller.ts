import { Readable } from 'node:stream';
import * as puppeteer from 'puppeteer';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { WritableOneOrMany } from '#/types.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { timeout } from '#/utils/timing.js';
import { isDefined, isNull, isNumber, isObject, isString, isUndefined } from '#/utils/type-guards.js';
import type { PdfRenderOptions } from './pdf-options.js';

export type Delay = number | DelayProvider;
export type DelayProvider = () => number;

export type PageControllerOptions = {
  actionDelay?: Delay,
  typeDelay?: Delay
};

export type SelectorOptions = {
  xpath?: boolean
};

export type WaitForElementOptions = {
  timeout?: number
};

export type PageLifecycleEvent = puppeteer.PuppeteerLifeCycleEvent;

export type WaitForOptions = {
  timeout?: number,
  waitUntil?: WritableOneOrMany<PageLifecycleEvent>
};

export class PageController implements AsyncDisposable {
  /** @deprecated should be avoided */
  readonly page: puppeteer.Page;
  readonly options: PageControllerOptions;

  constructor(pageOrFrame: puppeteer.Page | puppeteer.Frame, options: PageControllerOptions = {}) {
    this.page = (pageOrFrame instanceof puppeteer.Page) ? pageOrFrame : pageOrFrame.page();
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    return this.close();
  }

  async close(): Promise<void> {
    return this.page.close();
  }

  async setContent(html: string, options?: WaitForOptions): Promise<void> {
    await this.page.setContent(html, options);
  }

  async setExtraHttpHeaders(headers: Record<string, string>): Promise<void> {
    await this.page.setExtraHTTPHeaders(headers);
  }

  async authenticate(username: string, password: string): Promise<void> {
    await this.page.authenticate({ username, password });
  }

  async navigate(url: string, options?: WaitForOptions): Promise<void> {
    await this.page.goto(url, options);
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => this.page.once('close', resolve));
  }

  async waitForIdle(options?: { idleTime?: number, timeout?: number }): Promise<void> {
    await this.page.waitForNetworkIdle(options);
  }

  async waitForUrl(urlOrPredicate: string | ((url: string) => boolean | Promise<boolean>), options?: { timeout?: number }): Promise<void> {
    const pageFrame = this.page.mainFrame();

    await this.page.waitForFrame(async (frame) => {
      if (frame != pageFrame) {
        return false;
      }

      if (isString(urlOrPredicate)) {
        return frame.url().includes(urlOrPredicate);
      }

      return urlOrPredicate(frame.url());
    }, { timeout: options?.timeout });
  }

  async waitForFrame(selector: string, options?: SelectorOptions): Promise<PageController> {
    const frame = await this.waitForElementHandle<HTMLIFrameElement>(selector, options);
    return new PageController(frame.frame.page());
  }

  async waitForFrameByUrl(urlOrPredicate: string | ((frame: puppeteer.Frame) => boolean | Promise<boolean>), options?: { timeout?: number }): Promise<PageController> {
    const frame = await this.page.waitForFrame(urlOrPredicate, options);
    return new PageController(frame.page());
  }

  getDeepestFrame(): PageController {
    let frame = this.page.mainFrame();

    while (true) {
      const children = frame.childFrames();

      if (children.length > 1) {
        throw new Error('Multiple frames found. Only works with single frame.');
      }

      if (children.length == 0) {
        break;
      }

      frame = children[0]!;
    }

    return new PageController(frame);
  }

  async type(handleOrSelector: puppeteer.ElementHandle | string, text: string, options?: SelectorOptions): Promise<void> {
    await this.prepareAction();
    const handle = isString(handleOrSelector) ? await this.waitForElementHandle(handleOrSelector, options) : handleOrSelector;
    await handle.evaluate((element) => (element as HTMLInputElement).select());

    if (isUndefined(this.options.typeDelay)) {
      await handle.type(text);
    }
    else {
      for (const char of text) {
        await handle.type(char);
        await delay(this.options.typeDelay);
      }
    }
  }

  async select(handleOrSelector: puppeteer.ElementHandle | string, value: string, options?: SelectorOptions): Promise<void> {
    await this.prepareAction();

    const handle = isString(handleOrSelector) ? await this.waitForElementHandle(handleOrSelector, options) : handleOrSelector;
    await handle.select(value);
  }

  async click(handleOrSelector: puppeteer.ElementHandle | string, options?: SelectorOptions): Promise<void> {
    await this.prepareAction();

    const handle = isString(handleOrSelector) ? await this.waitForElementHandle(handleOrSelector, options) : handleOrSelector;
    await handle.click();
  }

  async getValue(handleOrSelector: puppeteer.ElementHandle | string, options?: SelectorOptions): Promise<string> {
    const handle = isString(handleOrSelector) ? await this.waitForElementHandle(handleOrSelector, options) : handleOrSelector;
    return handle.evaluate((element) => (element as HTMLInputElement).value);
  }

  async waitForElement(selector: string, options?: WaitForElementOptions & SelectorOptions): Promise<void> {
    await this.waitForElementHandle(selector, options);
  }

  async renderPdf(options: PdfRenderOptions = {}): Promise<Uint8Array> {
    const createPdfOptions: puppeteer.PDFOptions = convertPdfOptions(options);
    return this.page.pdf(createPdfOptions);
  }

  renderPdfStream(options: PdfRenderOptions = {}): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const createPdfOptions: puppeteer.PDFOptions = convertPdfOptions(options);
      const pdfStream = await this.page.createPDFStream(createPdfOptions);
      return Readable.toWeb(pdfStream) as ReadableStream<Uint8Array>;
    });
  }

  private async waitForElementHandle<T extends Node = Element>(selector: string, { timeout: waitTimeout = 5000, xpath = false }: WaitForElementOptions & SelectorOptions = {}): Promise<puppeteer.ElementHandle<T>> {
    const handle: puppeteer.ElementHandle<any> | null = xpath
      ? await this.page.waitForXPath(selector, { timeout: waitTimeout })
      : await this.page.waitForSelector(selector, { timeout: waitTimeout });

    if (isNull(handle)) {
      throw new Error('Element not found');
    }

    return handle;
  }

  private async prepareAction(): Promise<void> {
    await delay(this.options.actionDelay);
    await this.waitForIdle();
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

function convertPdfOptions(options: PdfRenderOptions): puppeteer.PDFOptions {
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
