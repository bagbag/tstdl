import { injectArg, singleton } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { afterResolve, resolveArgumentType } from '#/container/interfaces.js';
import { disposer } from '#/core.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import { isDefined } from '#/utils/type-guards.js';
import * as puppeteer from 'puppeteer';
import type { BrowserControllerOptions } from './browser-controller.js';
import { BrowserController } from './browser-controller.js';
import type { Browser } from './types.js';

export class BrowserServiceOptions {
  defaultNewBrowserOptions?: NewBrowserOptions;
}

export type BrowserServiceArgument = BrowserServiceOptions;

export type NewBrowserOptions = {
  headless?: boolean,
  width?: number,
  height?: number,
  language?: string,
  proxy?: string,

  /** @deprecated should be avoided */
  browserArguments?: string[],

  /** @deprecated should be avoided */
  browserEnvironment?: Record<string, string | undefined>,

  controllerOptions?: BrowserControllerOptions
};

@singleton()
export class BrowserService implements AsyncDisposable, Injectable<BrowserServiceArgument> {
  private readonly browsers: WeakRef<Browser>[];

  readonly options: BrowserServiceOptions | undefined;

  declare readonly [resolveArgumentType]: BrowserServiceArgument;
  constructor(@injectArg() options?: BrowserServiceOptions) {
    this.options = options;

    this.browsers = [];
  }

  [afterResolve](): void {
    disposer.add(this);
  }

  async [disposeAsync](): Promise<void> {
    return this.dispose();
  }

  async newBrowser(options?: NewBrowserOptions): Promise<BrowserController> {
    const { width = 1000, height = 1000, browserArguments, browserEnvironment, proxy, language, headless, controllerOptions }: NewBrowserOptions = { ...this.options?.defaultNewBrowserOptions, ...options };

    const args: string[] = [`--window-size=${width},${height}`, ...(browserArguments ?? [])];
    const env: Record<string, string | undefined> = { ...process.env, ...browserEnvironment };

    if (isDefined(proxy)) {
      args.push(`--proxy-server=${proxy}`);
    }

    if (isDefined(language)) {
      args.push(`--lang=${language}`);
      env['LANGUAGE'] = language;
    }

    const browser = await puppeteer.launch({
      headless: (headless == true) ? 'new' : false,
      args,
      env,
      defaultViewport: { width, height }
    });

    this.browsers.push(new WeakRef(browser));

    return new BrowserController(browser, controllerOptions);
  }

  async dispose(): Promise<void> {
    for (const browserRef of this.browsers) {
      const browser = browserRef.deref();

      if (isDefined(browser) && browser.isConnected()) {
        await browser.close();
      }
    }
  }
}
