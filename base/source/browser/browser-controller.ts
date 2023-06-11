import type { Browser, BrowserContextOptions } from 'playwright';

import { injectable } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { resolveArgumentType } from '#/container/interfaces.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { Record } from '#/types.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
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
  userAgent?: string,
  colorScheme?: 'light' | 'dark' | 'no-preference',
  locale?: string,
  extraHttpHeaders?: Record<string, string | undefined>,
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
      userAgent: mergedOptions.userAgent,
      colorScheme: mergedOptions.colorScheme,
      locale: mergedOptions.locale,
      viewport: mergedOptions.viewport,
      proxy: mergedOptions.proxy,
      extraHTTPHeaders: isDefined(mergedOptions.extraHttpHeaders) ? filterUndefinedFromRecord(mergedOptions.extraHttpHeaders) : undefined
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

  async waitForNoContexts(): Promise<void> {
    while (true) {
      const contexts = this.browser.contexts();

      if (contexts.length == 0) {
        break;
      }

      await new Promise<void>((resolve) => contexts[0]!.once('close', () => resolve()));
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
