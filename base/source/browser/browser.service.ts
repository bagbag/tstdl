import type { Browser, BrowserContext, LaunchOptions } from 'playwright';

import { injectArg, singleton } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { afterResolve, resolveArgumentType } from '#/container/interfaces.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import { BrowserContextController } from './browser-context-controller.js';
import type { NewBrowserContextOptions } from './browser-controller.js';
import { BrowserController } from './browser-controller.js';
import { getBrowserType } from './module.js';
import { getLaunchOptions, mergeNewBrowserContextOptions } from './utils.js';

export class BrowserServiceOptions {
  defaultNewBrowserOptions?: NewBrowserOptions;
}

export type BrowserServiceArgument = BrowserServiceOptions;

export type NewBrowserOptions = {
  browser?: 'chromium' | 'firefox' | 'webkit',
  headless?: boolean | 'new',
  proxy?: LaunchOptions['proxy'],

  windowSize?: {
    width: number,
    height: number
  },

  /** @deprecated should be avoided */
  browserArguments?: string[],

  defaultNewContextOptions?: NewBrowserContextOptions
};

@singleton()
export class BrowserService implements AsyncDisposable, Injectable<BrowserServiceArgument> {
  private readonly browsers: Set<Browser>;
  private readonly persistentBrowserContexts: Set<BrowserContext>;

  readonly options: BrowserServiceOptions | undefined;

  declare readonly [resolveArgumentType]: BrowserServiceArgument;
  constructor(@injectArg() options?: BrowserServiceOptions) {
    this.options = options;

    this.browsers = new Set();
    this.persistentBrowserContexts = new Set();
  }

  [afterResolve](): void {
    disposer.add(this);
  }

  async [disposeAsync](): Promise<void> {
    return this.dispose();
  }

  async newBrowser(options?: NewBrowserOptions): Promise<BrowserController> {
    const mergedOptions = { ...this.options?.defaultNewBrowserOptions, ...options };
    const launchOptions = getLaunchOptions(mergedOptions);

    const browser = await getBrowserType(mergedOptions.browser).launch(launchOptions);

    this.browsers.add(browser);
    browser.once('disconnected', () => this.browsers.delete(browser));

    return new BrowserController(browser, { defaultNewContextOptions: mergedOptions.defaultNewContextOptions });
  }

  async newPersistentContext(dataDirectory: string, browserOptions: NewBrowserOptions = {}, contextOptions: NewBrowserContextOptions = {}): Promise<BrowserContextController> {
    const mergedBrowserOptions: NewBrowserOptions = { ...this.options?.defaultNewBrowserOptions, ...browserOptions };
    const mergedContextOptions: NewBrowserContextOptions = mergeNewBrowserContextOptions(this.options?.defaultNewBrowserOptions?.defaultNewContextOptions, browserOptions.defaultNewContextOptions, contextOptions);
    const launchOptions = getLaunchOptions(mergedBrowserOptions);

    const context = await getBrowserType(mergedBrowserOptions.browser).launchPersistentContext(dataDirectory, {
      ...launchOptions,
      locale: mergedContextOptions.locale,
      viewport: mergedContextOptions.viewport,
      proxy: mergedContextOptions.proxy ?? mergedBrowserOptions.proxy,
      userAgent: mergedContextOptions.userAgent,
      colorScheme: mergedContextOptions.colorScheme,
      extraHTTPHeaders: isDefined(mergedContextOptions.extraHttpHeaders) ? filterUndefinedFromRecord(mergedContextOptions.extraHttpHeaders) : undefined
    });

    this.persistentBrowserContexts.add(context);
    context.once('close', () => this.persistentBrowserContexts.delete(context));

    return new BrowserContextController(context, mergedBrowserOptions.defaultNewContextOptions);
  }

  async waitForNoBrowsers(): Promise<void> {
    while (true) {
      if (this.browsers.size == 0) {
        break;
      }

      for (const browser of this.browsers) {
        if (browser.isConnected()) {
          await new Promise<void>((resolve) => browser.once('disconnected', () => resolve()));
        }
      }
    }
  }

  async dispose(): Promise<void> {
    for (const browser of this.browsers) {
      if (browser.isConnected()) {
        await browser.close();
      }
    }

    for (const context of this.persistentBrowserContexts) {
      await context.close();
    }
  }
}
