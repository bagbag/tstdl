import type { ElementHandle, Frame, Page } from 'playwright';

import { isNull, isUndefined } from '#/utils/type-guards.js';
import type { Delay } from './element-controller.js';
import type { FrameController, FrameControllerOptions } from './frame-controller.js';
import { LocatorController } from './locator-controller.js';
import type { PageControllerOptions } from './page-controller.js';

export type DocumentControllerOptions = {
  defaultActionDelay?: Delay,
  defaultTypeDelay?: Delay
};

export type DocumentControllerForwardOptions = {
  pageControllerOptions: PageControllerOptions,
  frameControllerOptions: FrameControllerOptions
};

export class DocumentController extends LocatorController {
  protected readonly forwardOptions: DocumentControllerForwardOptions;

  /** @deprecated should be avoided */
  readonly document: Page | Frame;

  constructor(document: Page | Frame, options: DocumentControllerOptions, forwardOptions: DocumentControllerForwardOptions) {
    super(document, { actionDelay: options.defaultActionDelay, typeDelay: options.defaultTypeDelay });

    this.document = document;
    this.forwardOptions = forwardOptions;
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

  async waitForElement(selector: string, options?: Parameters<Page['waitForSelector']>[1]): Promise<ElementHandle> {
    const element = await this.document.waitForSelector(selector, options!);

    if (isNull(element)) {
      throw new Error('Element not found.');
    }

    return element;
  }

  locateInFrame(frameSelector: string): LocatorController {
    const locator = this.document.frameLocator(frameSelector);
    return new LocatorController(locator, this.elementControllerOptions);
  }

  async waitForFrame(selector: string, options?: Parameters<Page['waitForSelector']>[1]): Promise<FrameController> {
    const element = await this.waitForElement(selector, options);
    const frame = await element.contentFrame();

    if (isNull(frame)) {
      throw new Error('Element is not a frame.');
    }

    return newFrameController(frame, this.forwardOptions.frameControllerOptions, { pageControllerOptions: this.forwardOptions.pageControllerOptions });
  }
}

let frameControllerConstructor: typeof FrameController | Promise<typeof FrameController>;

async function newFrameController(...args: ConstructorParameters<typeof FrameController>): Promise<FrameController> {
  if (isUndefined(frameControllerConstructor)) {
    frameControllerConstructor = importFrameController();
    void frameControllerConstructor.then((constructor) => (frameControllerConstructor = constructor));
  }

  return new (await frameControllerConstructor)(...args);
}

async function importFrameController(): Promise<typeof FrameController> {
  const module = await import('./frame-controller.js');
  return module.FrameController;
}
