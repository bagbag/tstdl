import type { Logger } from '#/logger/logger.js';
import { objectKeys } from '#/utils/object/object.js';
import { isDefined, isNull, isString, isUndefined } from '#/utils/type-guards.js';
import type { BrowserContext, ElementHandle, Frame, LaunchOptions, Locator, Page } from 'playwright';
import type { NewBrowserContextOptions } from './browser-controller.js';
import type { NewBrowserOptions } from './browser.service.js';

const pageLoggerMap = new WeakMap<Page, Logger>();

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


function getPageLogger(page: Page, baseLogger: Logger): Logger {
  let pageLogger = pageLoggerMap.get(page);

  if (isUndefined(pageLogger)) {
    pageLogger = baseLogger.subModule(crypto.randomUUID().slice(-12));
    pageLoggerMap.set(page, pageLogger);
  }

  return pageLogger;
}

export function attachLogger(loggable: Page | BrowserContext, logger: Logger): void {
  if (isPage(loggable)) {
    loggable.on('close', () => pageLoggerMap.delete(loggable));
    loggable.on('pageerror', (error) => logger.error(error));
  }

  loggable.on('console', (consoleMessage) => {
    const page = consoleMessage.page();
    const pageLogger = isNull(page) ? logger : getPageLogger(page, logger);

    const rawUrl = consoleMessage.page()?.url();
    const parsedUrl = (isString(rawUrl) && (rawUrl.length > 0)) ? new URL(rawUrl) : rawUrl;
    const url = isString(parsedUrl) ? parsedUrl : `${(parsedUrl?.protocol.startsWith('http') == true) ? '' : parsedUrl?.protocol}${parsedUrl?.host}${parsedUrl?.pathname}`;
    const location = consoleMessage.location();
    const rawLocationText = (location.lineNumber == 0) ? location.url : `${location.url}:${location.lineNumber}:${location.columnNumber}`;
    const locationText = rawLocationText.length == 0 ? undefined : rawLocationText;
    const additions = Object.entries({ location: locationText }).filter(([_, value]) => isDefined(value)).map(([key, value]) => `${key}: ${value}`).join(', ');
    const message = `${url}: ${consoleMessage.text()}${(additions.length > 0) ? ` (${additions})` : ''}`;

    switch (consoleMessage.type()) {
      case 'debug':
        pageLogger.debug(message);
        break;

      case 'error':
        pageLogger.error(message);
        break;

      case 'warning':
        pageLogger.warn(message);
        break;

      case 'trace':
        pageLogger.trace(message);
        break;

      case 'clear':
        break;

      case 'info':
      default:
        pageLogger.info(message);
        break;
    }
  });
}

export function isLocator(locatorOrHandle: Locator | ElementHandle): locatorOrHandle is Locator {
  return locatorOrHandle.constructor.name == 'Locator';
}

export function isElementHandle(locatorOrHandle: Locator | ElementHandle): locatorOrHandle is ElementHandle {
  return locatorOrHandle.constructor.name == 'ElementHandle';
}

export function isPage(pageOrFrameOrContext: Page | Frame | BrowserContext): pageOrFrameOrContext is Page {
  return pageOrFrameOrContext.constructor.name == 'Page';
}

export function isFrame(pageOrFrameOrContext: Page | Frame | BrowserContext): pageOrFrameOrContext is Frame {
  return pageOrFrameOrContext.constructor.name == 'Frame';
}

export function isBrowserContext(pageOrFrameOrContext: Page | Frame | BrowserContext): pageOrFrameOrContext is BrowserContext {
  return pageOrFrameOrContext.constructor.name == 'BrowserContext';
}
