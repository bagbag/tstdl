import type { Browser, BrowserContext, BrowserContextOptions } from 'playwright';

import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { Injectable } from '#/injector/decorators.js';
import { inject } from '#/injector/inject.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { Record, Writable } from '#/types/index.js';
import { filterUndefinedFromRecord } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import type { BrowserContextControllerOptions, BrowserContextState, NewPageOptions } from './browser-context-controller.js';
import { BrowserContextController } from './browser-context-controller.js';
import type { NewBrowserOptions } from './browser.service.js';
import { BrowserService } from './browser.service.js';
import { mergeNewBrowserContextOptions } from './utils.js';

export type BrowserControllerOptions = {
  defaultNewContextOptions?: NewBrowserContextOptions,
};

export type NewBrowserContextOptions = {
  state?: BrowserContextState,
  userAgent?: string,
  colorScheme?: 'light' | 'dark' | 'no-preference',
  locale?: string,
  extraHttpHeaders?: Record<string, string | undefined>,
  defaultNewPageOptions?: NewPageOptions,
  viewport?: { width: number, height: number } | null,
  proxy?: { server: string, bypass?: string, username?: string, password?: string },
};

export type BrowserControllerArgument = NewBrowserOptions;

type BrowserControllerResolutionContext = { browserService: BrowserService };

@Injectable<BrowserController, BrowserControllerArgument, BrowserControllerResolutionContext>({
  provider: {
    useFactory: (_argument: BrowserControllerArgument | undefined, context) => {
      context.data.browserService = inject(BrowserService);
      return new BrowserController(null as any); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    },
    async afterResolve(value, argument, { data: { browserService } }) {
      const { browser, controllerOptions } = await browserService.newRawBrowser(argument);
      (value as Writable<BrowserController>).browser = browser;
      (value as Writable<BrowserController>).options = controllerOptions;
    }
  }
})
export class BrowserController implements AsyncDisposable, Resolvable<BrowserControllerArgument> {
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

  /**
   * @deprecated for internal use
   */
  async newRawContext(options?: NewBrowserContextOptions): Promise<{ context: BrowserContext, controllerOptions: BrowserContextControllerOptions }> {
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

    return { context, controllerOptions: mergedOptions };
  }

  async newContext(options?: NewBrowserContextOptions): Promise<BrowserContextController> {
    const { context, controllerOptions } = await this.newRawContext(options);
    return new BrowserContextController(context, controllerOptions);
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
    return await new Promise((resolve) => {
      if (!this.browser.isConnected()) {
        resolve();
      }
      else {
        this.browser.once('disconnected', () => resolve());
      }
    });
  }
}
