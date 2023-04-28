import { injectable } from '#/container/decorators.js';
import type { Injectable } from '#/container/interfaces.js';
import { resolveArgumentType } from '#/container/interfaces.js';
import type { AsyncDisposable } from '#/disposable/disposable.js';
import { disposeAsync } from '#/disposable/disposable.js';
import type { Unoptionalize } from '#/types.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { isDefined } from '#/utils/type-guards.js';
import * as puppeteer from 'puppeteer';
import type { NewBrowserOptions } from './browser.service.js';
import { BrowserService } from './browser.service.js';
import type { PageControllerOptions } from './page-controller.js';
import { PageController } from './page-controller.js';

export type BrowserControllerOptions = {
  defaultNewPageOptions?: NewPageOptions
};

export type NewPageOptions = {
  extraHttpHeaders?: Record<string, string>,
  controllerOptions?: PageControllerOptions
};

@injectable({
  provider: {
    useFactory: async (argument: NewBrowserOptions | undefined, context) => {
      const browserService = await context.resolveAsync(BrowserService);
      return browserService.newBrowser(argument);
    }
  }
})
export class BrowserController implements AsyncDisposable, Injectable<NewBrowserOptions> {
  /** @deprecated should be avoided */
  readonly browser: puppeteer.Browser;
  readonly options: BrowserControllerOptions | undefined;

  declare readonly [resolveArgumentType]: NewBrowserOptions;
  constructor(browser: puppeteer.Browser, options?: BrowserControllerOptions) {
    this.browser = browser;
    this.options = options;
  }

  async [disposeAsync](): Promise<void> {
    return this.close();
  }

  async close(): Promise<void> {
    if (this.browser.isConnected()) {
      await this.browser.close();
    }
  }

  async newPage(options?: NewPageOptions): Promise<PageController> {
    const mergedExtraHttpHeaderEntries = [...objectEntries(options?.extraHttpHeaders ?? {}), ...objectEntries(this.options?.defaultNewPageOptions?.extraHttpHeaders ?? {})];

    const newPageOptions: Unoptionalize<NewPageOptions> = {
      controllerOptions: options?.controllerOptions ?? this.options?.defaultNewPageOptions?.controllerOptions,
      extraHttpHeaders: (mergedExtraHttpHeaderEntries.length > 0) ? fromEntries(mergedExtraHttpHeaderEntries) : undefined
    };

    const page = await this.browser.newPage();
    const controller = new PageController(page, newPageOptions.controllerOptions);

    if (isDefined(newPageOptions.extraHttpHeaders)) {
      await controller.setExtraHttpHeaders(newPageOptions.extraHttpHeaders);
    }

    return controller;
  }

  async waitForClose(): Promise<void> {
    return new Promise((resolve) => this.browser.once('disconnected', resolve));
  }
}
