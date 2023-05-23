import type { Page } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { readableStreamFromPromise } from '#/utils/stream/readable-stream-from-promise.js';
import { withTimeout } from '#/utils/timing.js';
import { isDefined, isNull, isObject, isUndefined } from '#/utils/type-guards.js';
import { millisecondsPerSecond } from '#/utils/units.js';
import type { DocumentControllerOptions } from './document-controller.js';
import { DocumentController } from './document-controller.js';
import type { FrameControllerOptions } from './frame-controller.js';
import { FrameController } from './frame-controller.js';
import type { PdfRenderOptions } from './pdf-options.js';
import type { Abortable } from './types.js';

export type PageControllerOptions = DocumentControllerOptions & {
  defaultFrameControllerOptions?: FrameControllerOptions
};

export class PageController extends DocumentController<Page> implements AsyncDisposable {
  /** @deprecated should be avoided */
  readonly page: Page;
  readonly options: PageControllerOptions;

  constructor(page: Page, options: PageControllerOptions = {}) {
    super(page, options, { pageControllerOptions: options, frameControllerOptions: options.defaultFrameControllerOptions ?? options });

    this.page = page;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.page.close();
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

  /**
   * @param frameSelector frame name, url or url predicate
   * @returns
   */
  frame(frameSelector: Parameters<Page['frame']>[0]): FrameController {
    const frame = this.page.frame(frameSelector);

    if (isNull(frame)) {
      throw new Error('Frame not found.');
    }

    return new FrameController(frame, this.options, this.forwardOptions);
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
