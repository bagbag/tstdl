import { NotSupportedError } from '#/error/not-supported.error.js';
import { objectKeys } from '#/utils/object/object.js';
import type { BrowserType, LaunchOptions } from 'playwright';
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
