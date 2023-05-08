import type { BrowserType } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';

import { container } from '#/container/container.js';
import { NotSupportedError } from '#/error/not-supported.error.js';
import { copyObjectProperties, filterUndefinedObjectProperties } from '#/utils/object/object.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { BrowserServiceOptions } from './browser.service.js';

export type BrowserModuleOptions = {
  browsers: {
    chromium?: BrowserType,
    firefox?: BrowserType,
    webkit?: BrowserType
  },
  options?: BrowserServiceOptions
};

const browserTypes = {
  chromium,
  firefox,
  webkit
};

export function configureBrowser(options: BrowserModuleOptions): void {
  const filtered = filterUndefinedObjectProperties(options.browsers);
  copyObjectProperties(filtered, browserTypes);

  if (isDefined(options.options)) {
    container.register(BrowserServiceOptions, { useValue: options.options });
  }
}

export function getBrowserType(type: keyof typeof browserTypes | undefined): BrowserType {
  const browserType = browserTypes[type ?? 'chromium'];

  if (isUndefined(browserType)) {
    throw new NotSupportedError(`Browser type ${type} is not supported.`);
  }

  return browserType;
}
