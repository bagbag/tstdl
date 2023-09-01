import type { Frame, Page } from 'playwright';

import { isNull } from '#/utils/type-guards.js';
import type { BrowserContextController } from './browser-context-controller.js';
import type { DocumentControllerOptions } from './document-controller.js';
import { DocumentController } from './document-controller.js';
import type { PageController, PageControllerOptions } from './page-controller.js';

export type FrameControllerOptions = DocumentControllerOptions;

export class FrameController extends DocumentController<Frame> {
  /** @deprecated should be avoided */
  readonly frame: Frame;
  override readonly options: FrameControllerOptions;

  constructor(frame: Frame, context: BrowserContextController, options: FrameControllerOptions) {
    super(frame, context, options);

    this.options = options;
  }

  /** Get the page containing this frame */
  getPage(options?: PageControllerOptions): PageController {
    return this.context.getControllerByPage(this.frame.page(), options);
  }

  /**
   * @param frameSelector frame name, url or url predicate
   * @returns
   */
  getFrame(frameSelector: Parameters<Page['frame']>[0], options?: FrameControllerOptions): FrameController {
    const frame = this.frame.page().frame(frameSelector);

    if (isNull(frame)) {
      throw new Error('Frame not found.');
    }

    return this.getControllerByFrame(frame, { ...this.options, ...options });
  }
}
