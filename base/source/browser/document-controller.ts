import type { ElementHandle, Frame, FrameLocator, Page } from 'playwright';

import { isDefined, isNull } from '#/utils/type-guards.js';
import type { BrowserContextController } from './browser-context-controller.js';
import { ElementController } from './element-controller.js';
import type { FrameController, FrameControllerOptions } from './frame-controller.js';
import { LocatorController } from './locator-controller.js';
import type { Delay } from './types.js';
import { isPage } from './utils.js';

export type DocumentControllerOptions = {
  defaultActionDelay?: Delay,
  defaultTypeDelay?: Delay
};

let frameControllerConstructor: typeof FrameController;

export function setFrameControllerConstructor(constructor: typeof FrameController): void {
  frameControllerConstructor = constructor;
}

export class DocumentController<T extends Page | Frame = Page | Frame> extends LocatorController<T> {
  readonly #frameControllers = new WeakMap<Frame, FrameController>();

  /** @deprecated should be avoided */
  readonly document: T;
  readonly context: BrowserContextController;
  readonly options: DocumentControllerOptions;

  constructor(document: T, context: BrowserContextController, options: DocumentControllerOptions) {
    super(document, { actionDelay: options.defaultActionDelay, typeDelay: options.defaultTypeDelay });

    this.document = document;
    this.context = context;
    this.options = options;
  }

  frames(): FrameController[] {
    const frames = isPage(this.document) ? this.document.frames() : this.document.childFrames();
    return frames.map((page) => this.getControllerByFrame(page));
  }

  /**
   * Get a controller for the frame.
   * @param frame frame to get controller for
   * @param options options to use for the frame controller *if* it is new. Ignored if there is already a controller associated.
   */
  getControllerByFrame(frame: Frame, options?: FrameControllerOptions): FrameController {
    const documentPage = isPage(this.document) ? this.document : this.document.page();

    if (frame.page() != documentPage) {
      throw new Error('Frame is not from this page.');
    }

    const existingController = this.#frameControllers.get(frame);

    if (isDefined(existingController)) {
      return existingController;
    }

    const newController = new frameControllerConstructor(frame, this.context, { ...this.options, ...options });
    this.#frameControllers.set(frame, newController);

    return newController;
  }

  async setContent(...args: Parameters<Page['setContent']>): Promise<void> {
    await this.document.setContent(...args);
  }

  async navigate(...args: Parameters<Page['goto']>): Promise<void> {
    await this.document.goto(...args);
  }

  async waitForLoadState(...args: Parameters<Page['waitForLoadState']>): Promise<void> {
    await this.document.waitForLoadState(...args);
  }

  async waitForUrl(...args: Parameters<Page['waitForURL']>): Promise<void> {
    await this.document.waitForURL(...args);
  }

  async waitForElement(selector: string, options?: Parameters<Page['waitForSelector']>[1]): Promise<ElementController<ElementHandle<SVGElement | HTMLElement>>> {
    const element = await this.document.waitForSelector(selector, options!);

    if (isNull(element)) {
      throw new Error('Element not found.');
    }

    return new ElementController(element, this.elementControllerOptions);
  }

  locateInFrame(frameSelector: string): LocatorController<FrameLocator> {
    const locator = this.document.frameLocator(frameSelector);
    return new LocatorController(locator, this.elementControllerOptions);
  }

  async waitForFrame(selector: string, options?: Parameters<Page['waitForSelector']>[1], controllerOptions?: FrameControllerOptions): Promise<FrameController> {
    const element = await this.waitForElement(selector, options);
    const frame = await element.locatorOrHandle.contentFrame();

    if (isNull(frame)) {
      throw new Error('Element is not a frame.');
    }

    return this.getControllerByFrame(frame, controllerOptions);
  }
}
