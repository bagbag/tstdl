import { objectKeys } from '#/utils/object/object.js';
import { isFunction } from '#/utils/type-guards.js';
import type { ElementHandle, LaunchOptions, Locator } from 'playwright';
import type { NewBrowserContextOptions } from './browser-controller.js';
import type { NewBrowserOptions } from './browser.service.js';

export function getLaunchOptions(options: NewBrowserOptions): LaunchOptions {
  const { windowSize, browserArguments, headless }: NewBrowserOptions = options;
  const args: string[] = [`--window-size=${windowSize?.width ?? 1000},${windowSize?.height ?? 1000}`, ...(browserArguments ?? [])];

  if (options.headless == 'new') {
    args.push('--headless=new');
  }

  return {
    ignoreDefaultArgs: (options.headless == 'new') ? ['--headless'] : undefined,
    headless: headless != false,
    args,
    proxy: options.proxy
  };
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

export function isLocator(locatorOrHandle: Locator | ElementHandle): locatorOrHandle is Locator {
  return isFunction((locatorOrHandle as Locator).count); // eslint-disable-line @typescript-eslint/unbound-method
}

export function isElementHandle(locatorOrHandle: Locator | ElementHandle): locatorOrHandle is Locator {
  return isFunction((locatorOrHandle as ElementHandle).asElement); // eslint-disable-line @typescript-eslint/unbound-method
}
