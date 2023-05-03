import type { Browser, BrowserContextOptions } from 'playwright';

import { injectable } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { resolveArgumentType } from '#/container/interfaces.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { BrowserContextState, NewPageOptions } from './browser-context-controller.js';
import { BrowserContextController } from './browser-context-controller.js';
import type { NewBrowserOptions } from './browser.service.js';
import { BrowserService } from './browser.service.js';
import { mergeNewBrowserContextOptions } from './utils.js';

export type BrowserControllerOptions = {
  defaultNewContextOptions?: NewBrowserContextOptions
};

export type NewBrowserContextOptions = {
  state?: BrowserContextState,
  locale?: string,
  extraHttpHeaders?: Record<string, string>,
  defaultNewPageOptions?: NewPageOptions,
  viewport?: { width: number, height: number } | null,
  proxy?: { server: string, bypass?: string, username?: string, password?: string }
};

export type BrowserControllerArgument = NewBrowserOptions;

@injectable({
  provider: {
    useFactory: async (argument: BrowserControllerArgument | undefined, context) => {
      const browserService = await context.resolveAsync(BrowserService);
      return browserService.newBrowser(argument);
    }
  }
})
export class BrowserController implements AsyncDisposable, Injectable<BrowserControllerArgument> {
  /** @deprecated should be avoided */
  readonly browser: Browser;
  readonly options: BrowserControllerOptions | undefined;

  declare readonly [resolveArgumentType]: BrowserControllerArgument;
  constructor(browser: Browser, options?: BrowserControllerOptions) {
    this.browser = browser;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    await this.close();
  }

  async newContext(options?: NewBrowserContextOptions): Promise<BrowserContextController> {
    const mergedOptions = mergeNewBrowserContextOptions(this.options?.defaultNewContextOptions, options);

    const context = await this.browser.newContext({
      storageState: mergedOptions.state as BrowserContextOptions['storageState'],
      locale: mergedOptions.locale,
      viewport: mergedOptions.viewport,
      proxy: mergedOptions.proxy,
      extraHTTPHeaders: mergedOptions.extraHttpHeaders
    });

    return new BrowserContextController(context, mergedOptions);
  }

  async close(): Promise<void> {
    if (this.browser.isConnected()) {
      for (const context of this.browser.contexts()) {
        await context.close();
      }

      await this.browser.close();
    }
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => {
      if (!this.browser.isConnected()) {
        resolve();
      }
      else {
        this.browser.once('disconnected', () => resolve());
      }
    });
  }
}
