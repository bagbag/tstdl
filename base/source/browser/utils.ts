import { NotSupportedError } from '#/error/not-supported.error.js';
import { objectKeys } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';
import type { BrowserType, ElementHandle, LaunchOptions, Locator } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';
import type { NewBrowserContextOptions } from './browser-controller.js';
import type { NewBrowserOptions } from './browser.service.js';

export function getLaunchOptions(options: NewBrowserOptions): LaunchOptions {
  const { windowSize, browserArguments, headless }: NewBrowserOptions = options;
  const args: string[] = [`--window-size=${windowSize?.width ?? 1000},${windowSize?.height ?? 1000}`, ...(browserArguments ?? [])];

  return { headless, args };
}

export function mergeNewBrowserContextOptions(a: NewBrowserContextOptions | undefined, b?: NewBrowserContextOptions, c?: NewBrowserContextOptions): NewBrowserContextOptions {
  const mergedExtraHttpHeaders = { ...a?.extraHttpHeaders, ...b?.extraHttpHeaders, ...c?.extraHttpHeaders };

  return {
    ...a,
    ...b,
    ...c,
    extraHttpHeaders: (objectKeys(mergedExtraHttpHeaders).length > 0) ? mergedExtraHttpHeaders : undefined
  };
}

export function getBrowserType(type: string | undefined): BrowserType {
  let browserType: BrowserType;

  switch (type) {
    case 'chromium':
    case undefined:
      browserType = chromium;
      break;

    case 'firefox':
      browserType = firefox;
      break;

    case 'webkit':
      browserType = webkit;
      break;

    default:
      throw new NotSupportedError(`Browser type ${type} is not supported.`);
  }

  return browserType;
}


const exclusiveLocatorKey: Exclude<keyof Locator, keyof ElementHandle> = 'locator';
export function isLocator(value: Locator | ElementHandle): value is Locator {
  return isFunction((value as Locator)[exclusiveLocatorKey]);
}

const exclusiveElementHandleKey: Exclude<keyof ElementHandle, keyof Locator> = '$';
export function isElementHandle(value: Locator | ElementHandle): value is ElementHandle {
  return isFunction((value as ElementHandle)[exclusiveElementHandleKey]);
}
