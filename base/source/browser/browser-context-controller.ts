import type { BrowserContext, Page } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { Injectable } from '#/injector/decorators.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { afterResolve, resolveArgumentType } from '#/injector/interfaces.js';
import type { Logger } from '#/logger/logger.js';
import type { Record, Writable } from '#/types/index.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import type { Tagged } from 'type-fest';
import type { NewBrowserContextOptions } from './browser-controller.js';
import { BrowserController } from './browser-controller.js';
import type { PageControllerOptions } from './page-controller.js';
import { PageController } from './page-controller.js';
import { attachLogger } from './utils.js';

export type BrowserContextControllerOptions = {
  defaultNewPageOptions?: NewPageOptions
};

export type NewPageOptions = {
  extraHttpHeaders?: Record<string, string>,
  controllerOptions?: PageControllerOptions
};

export type BrowserContextState = Tagged<Record<string | number, unknown>, 'BrowserContextState'>;

export type BrowserContextControllerArgument = NewBrowserContextOptions;

@Injectable<BrowserContextController, BrowserContextControllerArgument, { browserController: BrowserController }>({
  provider: {
    useFactory: (_, context) => {
      context.data.browserController = context.resolve(BrowserController);
      return new BrowserContextController(null as any);
    },
    async afterResolve(value, argument, { data: { browserController } }) {
      const { context: browserContext, controllerOptions } = await browserController.newRawContext(argument);
      (value as Writable<BrowserContextController>).context = browserContext;
      (value as Writable<BrowserContextController>).options = controllerOptions;
    }
  }
})
export class BrowserContextController implements AsyncDisposable, Resolvable<BrowserContextControllerArgument> {
  readonly #pageControllers = new WeakMap<Page, PageController>();

  /** @deprecated should be avoided */
  readonly context: BrowserContext;
  readonly options: BrowserContextControllerOptions;

  declare readonly [resolveArgumentType]: BrowserContextControllerArgument;
  constructor(context: BrowserContext, options: BrowserContextControllerOptions = {}) {
    this.context = context;
    this.options = options;
  }

  [afterResolve](): void {
    this.initialize();
  }

  initialize(): void {
    this.context.on('page', (page) => {
      page.once('close', () => this.#pageControllers.delete(page));
    });
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  pages(): PageController[] {
    const pages = this.context.pages();
    return pages.map((page) => this.getControllerByPage(page));
  }

  /**
   * Get a controller for the page.
   * @param page page to get controller for
   * @param options options to use for the page controller *if* it is new. Ignored if there is already a controller associated.
   */
  getControllerByPage(page: Page, options?: PageControllerOptions): PageController {
    if (page.context() != this.context) {
      throw new Error('Page is not from this context.');
    }

    const existingController = this.#pageControllers.get(page);

    if (isDefined(existingController)) {
      return existingController;
    }

    const newController = new PageController(page, this, { ...this.options.defaultNewPageOptions?.controllerOptions, ...options });
    this.#pageControllers.set(page, newController);

    return newController;
  }

  async close(): Promise<void> {
    await this.context.close();
  }

  async getState(): Promise<BrowserContextState> {
    const state = await this.context.storageState();
    return state as any as BrowserContextState;
  }

  async setExtraHttpHeaders(headers: Record<string, string | undefined>): Promise<void> {
    const filtered = filterUndefinedFromRecord(headers);
    await this.context.setExtraHTTPHeaders(filtered);
  }

  async newPage(options?: NewPageOptions): Promise<PageController> {
    const page = await this.context.newPage();

    const mergedOptions = { ...this.options.defaultNewPageOptions, ...options };
    const controller = new PageController(page, this, mergedOptions.controllerOptions);

    this.#pageControllers.set(page, controller);

    if (isDefined(mergedOptions.extraHttpHeaders)) {
      await controller.setExtraHttpHeaders(mergedOptions.extraHttpHeaders);
    }

    return controller;
  }

  async waitForNoPages(): Promise<void> {
    while (true) {
      const pages = this.context.pages();

      if (pages.length == 0) {
        break;
      }

      for (const page of pages) {
        if (!page.isClosed()) {
          await new Promise<void>((resolve) => page.once('close', () => resolve()));
        }
      }
    }
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => this.context.once('close', () => resolve()));
  }

  attachLogger(logger: Logger): void {
    attachLogger(this.context, logger);
  }
}
