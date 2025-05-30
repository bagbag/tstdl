import type { Page } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { Logger } from '#/logger/logger.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { readableStreamFromPromise } from '#/utils/stream/from-promise.js';
import { toReadableStream } from '#/utils/stream/to-readable-stream.js';
import { withTimeout } from '#/utils/timing.js';
import { isDefined, isNull, isObject, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { BrowserContextController } from './browser-context-controller.js';
import type { DocumentControllerOptions } from './document-controller.js';
import { DocumentController } from './document-controller.js';
import { ElementController } from './element-controller.js';
import type { FrameController, FrameControllerOptions } from './frame-controller.js';
import type { PdfRenderOptions } from './pdf-options.js';
import type { Abortable } from './types.js';
import { attachLogger, delay } from './utils.js';

export type PageControllerOptions = DocumentControllerOptions;

export type ScrollToCoordinates = { x?: number, y?: number };

export class PageController extends DocumentController<Page> implements AsyncDisposable {
  /** @deprecated should be avoided */
  readonly page: Page;
  override readonly options: PageControllerOptions;

  constructor(page: Page, context: BrowserContextController, options: PageControllerOptions = {}) {
    super(page, context, options);

    this.page = page;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.page.close();
  }

  /** finds pages opened by this page (having opener set to this page) */
  async opened(): Promise<PageController[]> {
    const openedPages: PageController[] = [];

    for (const page of this.context.pages()) {
      if (await page.opener() == this) {
        openedPages.push(page);
      }
    }

    return openedPages;
  }

  async opener(): Promise<PageController | null> {
    const opener = await this.page.opener();

    if (isNull(opener)) {
      return null;
    }

    return this.context.getControllerByPage(opener);
  }

  async setExtraHttpHeaders(headers: Record<string, string>): Promise<void> {
    const filtered = filterUndefinedFromRecord(headers);
    await this.page.setExtraHTTPHeaders(filtered);
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

  url(): string {
    return this.page.url();
  }

  /**
   * @param frameSelector frame name, url or url predicate
   * @returns
   */
  frame(frameSelector: Parameters<Page['frame']>[0], options?: FrameControllerOptions): FrameController {
    const frame = this.page.frame(frameSelector);

    if (isNull(frame)) {
      throw new Error('Frame not found.');
    }

    return this.getControllerByFrame(frame, { ...this.options, ...options });
  }

  async renderPdf(options: PdfRenderOptions & Abortable = {}): Promise<Uint8Array> {
    const createPdfOptions = convertPdfOptions(options);
    return withTimeout(options.timeout ?? 30 * millisecondsPerSecond, this.page.pdf(createPdfOptions), { errorMessage: 'Rendering pdf timed out.' });
  }

  async scroll(deltaX: number, deltaY: number): Promise<void> {
    await this.page.mouse.wheel(deltaX, deltaY);
  }

  async scrollTo(coordinatesOrController: ScrollToCoordinates | ElementController): Promise<void> {
    const viewportSize = this.page.viewportSize();

    if (isNull(viewportSize)) {
      throw new Error('Could not get page viewport size.');
    }

    const targetLeft = viewportSize.width / 3;
    const targetRight = viewportSize.width / 3 * 2;
    const targetTop = viewportSize.height / 3;
    const targetBottom = viewportSize.height / 3 * 2;

    const offsetX = viewportSize.width / 10;
    const offsetY = viewportSize.height / 10;

    const isElement = coordinatesOrController instanceof ElementController;

    while (true) {
      const { scrollWidth, scrollHeight, scrollLeft, scrollTop, clientWidth, clientHeight } = await this.page.evaluate(async () => {
        const { scrollWidth, scrollHeight, scrollLeft, scrollTop, clientWidth, clientHeight } = document.documentElement;
        return { scrollWidth, scrollHeight, scrollLeft, scrollTop, clientWidth, clientHeight };
      });

      let targetX: number | undefined;
      let targetY: number | undefined;

      if (isElement) {
        const boundingBox = await coordinatesOrController.boundingBox();

        if (isNull(boundingBox)) {
          throw new Error('Could not get element bounding box.');
        }

        targetX = boundingBox.x + (boundingBox.width / 2);
        targetY = boundingBox.y + (boundingBox.height / 2);
      }
      else {
        targetX = isDefined(coordinatesOrController.x) ? (coordinatesOrController.x - scrollLeft) : undefined;
        targetY = isDefined(coordinatesOrController.y) ? (coordinatesOrController.y - scrollTop) : undefined;
      }

      const deltaX = isUndefined(targetX) ? undefined : ((targetX < targetLeft) && (scrollLeft > 0)) ? -offsetX : ((targetX > targetRight) && ((scrollLeft + clientWidth) < scrollWidth)) ? offsetX : undefined;
      const deltaY = isUndefined(targetY) ? undefined : ((targetY < targetTop) && (scrollTop > 0)) ? -offsetY : ((targetY > targetBottom) && ((scrollTop + clientHeight) < scrollHeight)) ? offsetY : undefined;

      if (isDefined(deltaY)) {
        await this.page.mouse.wheel(0, deltaY);
        await delay(Math.max(10, 150 - (Math.abs(targetY! - targetTop) / 10)));
      }
      else if (isDefined(deltaX)) {
        await this.page.mouse.wheel(deltaX, 0);
        await delay(Math.max(10, 150 - (Math.abs(targetX! - targetLeft) / 10)));
      }
      else {
        break;
      }
    }
  }

  renderPdfStream(options: PdfRenderOptions & Abortable = {}): ReadableStream<Uint8Array> {
    return readableStreamFromPromise(async () => {
      const buffer = await this.renderPdf(options);
      return toReadableStream(buffer);
    });
  }

  attachLogger(logger: Logger): void {
    attachLogger(this.page, logger);
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
