import type { Browser, BrowserContext, LaunchOptions } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { InjectArg, Singleton } from '#/injector/decorators.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { resolveArgumentType } from '#/injector/interfaces.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import { BrowserContextController } from './browser-context-controller.js';
import type { BrowserControllerOptions, NewBrowserContextOptions } from './browser-controller.js';
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

@Singleton()
export class BrowserService implements AsyncDisposable, Resolvable<BrowserServiceArgument> {
  private readonly browsers: Set<Browser>;
  private readonly persistentBrowserContexts: Set<BrowserContext>;

  readonly options: BrowserServiceOptions | undefined;

  declare readonly [resolveArgumentType]: BrowserServiceArgument;
  constructor(@InjectArg() options?: BrowserServiceOptions) {
    this.options = options;

    this.browsers = new Set();
    this.persistentBrowserContexts = new Set();
  }

  async [disposeAsync](): Promise<void> {
    return this.dispose();
  }

  /**
   * @deprecated internal use only
   */
  async newRawBrowser(options?: NewBrowserOptions): Promise<{ browser: Browser, controllerOptions: BrowserControllerOptions }> {
    const mergedOptions = { ...this.options?.defaultNewBrowserOptions, ...options };
    const launchOptions = getLaunchOptions(mergedOptions);

    const browser = await getBrowserType(mergedOptions.browser).launch(launchOptions);

    this.browsers.add(browser);
    browser.once('disconnected', () => this.browsers.delete(browser));

    return { browser, controllerOptions: { defaultNewContextOptions: mergedOptions.defaultNewContextOptions } };
  }

  async newBrowser(options?: NewBrowserOptions): Promise<BrowserController> {
    const { browser, controllerOptions } = await this.newRawBrowser(options);
    return new BrowserController(browser, controllerOptions);
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
