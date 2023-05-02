import type { BrowserContext } from 'playwright';

import { injectable } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { resolveArgumentType } from '#/container/interfaces.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { Json } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import type { Opaque } from 'type-fest';
import type { NewBrowserContextOptions } from './browser-controller.js';
import { BrowserController } from './browser-controller.js';
import type { PageControllerOptions } from './page-controller.js';
import { PageController } from './page-controller.js';

export type BrowserContextControllerOptions = {
  defaultNewPageOptions?: NewPageOptions
};

export type NewPageOptions = {
  extraHttpHeaders?: Record<string, string>,
  controllerOptions?: PageControllerOptions
};

export type BrowserContextState = Opaque<Json, 'BrowserContextState'>;

export type BrowserContextControllerArgument = NewBrowserContextOptions;

@injectable({
  provider: {
    useFactory: async (argument: BrowserContextControllerArgument | undefined, context) => {
      const browserController = await context.resolveAsync(BrowserController);
      return browserController.newContext(argument);
    }
  }
})
export class BrowserContextController implements AsyncDisposable, Injectable<BrowserContextControllerArgument> {
  private readonly options: BrowserContextControllerOptions;

  /** @deprecated should be avoided */
  readonly context: BrowserContext;

  declare readonly [resolveArgumentType]: BrowserContextControllerArgument;
  constructor(context: BrowserContext, options: BrowserContextControllerOptions = {}) {
    this.context = context;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async close(): Promise<void> {
    await this.context.close();
  }

  async getState(): Promise<BrowserContextState> {
    const state = await this.context.storageState();
    return state as any as BrowserContextState;
  }

  async setExtraHttpHeaders(headers: Record<string, string>): Promise<void> {
    await this.context.setExtraHTTPHeaders(headers);
  }

  async newPage(options?: NewPageOptions): Promise<PageController> {
    const page = await this.context.newPage();

    const mergedOptions = { ...this.options.defaultNewPageOptions, ...options };
    const controller = new PageController(page, mergedOptions.controllerOptions);

    if (isDefined(mergedOptions.extraHttpHeaders)) {
      await controller.setExtraHttpHeaders(mergedOptions.extraHttpHeaders);
    }

    return controller;
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => this.context.once('close', () => resolve()));
  }
}
