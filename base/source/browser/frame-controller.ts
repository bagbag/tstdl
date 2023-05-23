import type { Frame, Page } from 'playwright';

import { isNull } from '#/utils/type-guards.js';
import type { DocumentControllerOptions } from './document-controller.js';
import { DocumentController } from './document-controller.js';
import type { PageControllerOptions } from './page-controller.js';
import { PageController } from './page-controller.js';

export type FrameControllerOptions = DocumentControllerOptions;

export type FrameControllerForwardOptions = {
  pageControllerOptions: PageControllerOptions
};

export class FrameController extends DocumentController<Frame> {
  private readonly frameControllerForwardOptions: FrameControllerForwardOptions;

  /** @deprecated should be avoided */
  readonly frame: Frame;
  readonly options: FrameControllerOptions;

  constructor(frame: Frame, options: FrameControllerOptions, forwardOptions: FrameControllerForwardOptions) {
    super(frame, options, { frameControllerOptions: options, pageControllerOptions: forwardOptions.pageControllerOptions });

    this.options = options;
    this.frameControllerForwardOptions = forwardOptions;
  }

  /** Get the page containing this frame */
  getPage(): PageController {
    return new PageController(this.frame.page(), this.frameControllerForwardOptions.pageControllerOptions);
  }

  /**
   * @param frameSelector frame name, url or url predicate
   * @returns
   */
  getFrame(frameSelector: Parameters<Page['frame']>[0]): FrameController {
    const frame = this.frame.page().frame(frameSelector);

    if (isNull(frame)) {
      throw new Error('Frame not found.');
    }

    return new FrameController(frame, this.options, this.frameControllerForwardOptions);
  }
}
