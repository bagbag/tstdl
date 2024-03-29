import type { BrowserType } from 'playwright';
import { chromium, firefox, webkit } from 'playwright';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Injector } from '#/injector/injector.js';
import { copyObjectProperties, filterUndefinedObjectProperties } from '#/utils/object/object.js';
import { isDefined, isUndefined } from '#/utils/type-guards.js';
import { BrowserServiceOptions } from './browser.service.js';
import { setFrameControllerConstructor } from './document-controller.js';
import { FrameController } from './frame-controller.js';

export type BrowserModuleOptions = {
  browsers?: {
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
  if (isDefined(options.browsers)) {
    const filtered = filterUndefinedObjectProperties(options.browsers);
    copyObjectProperties(filtered, browserTypes);
  }

  if (isDefined(options.options)) {
    Injector.register(BrowserServiceOptions, { useValue: options.options });
  }
}

export function getBrowserType(type: keyof typeof browserTypes | undefined): BrowserType {
  const browserType = browserTypes[type ?? 'chromium'];

  if (isUndefined(browserType)) {
    throw new NotSupportedError(`Browser type ${type} is not supported.`);
  }

  return browserType;
}

setFrameControllerConstructor(FrameController);
