import type { Frame, FrameLocator, Locator, Page } from 'playwright';

import type { NonUndefinable, SimplifyObject } from '#/types/index.js';
import type { ElementControllerOptions } from './element-controller.js';
import { ElementController } from './element-controller.js';

export class LocatorController<T extends Page | Frame | Locator | FrameLocator = Page | Frame | Locator | FrameLocator> {
  protected readonly elementControllerOptions: ElementControllerOptions;

  readonly locatable: T;

  constructor(locatable: T, elementControllerOptions: ElementControllerOptions) {
    this.locatable = locatable;
    this.elementControllerOptions = elementControllerOptions;
  }

  getBySelector(selector: string, options?: SimplifyObject<Pick<NonUndefinable<Parameters<Page['locator']>[1]>, 'hasText' | 'hasNotText'>>): ElementController<Locator> {
    const locator = this.locatable.locator(selector, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByRole(role: Parameters<Page['getByRole']>[0], options?: Parameters<Page['getByRole']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByRole(role, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByLabel(text: Parameters<Page['getByLabel']>[0], options?: Parameters<Page['getByLabel']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByLabel(text, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByAltText(text: Parameters<Page['getByAltText']>[0], options?: Parameters<Page['getByAltText']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByAltText(text, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByPlaceholder(text: Parameters<Page['getByPlaceholder']>[0], options?: Parameters<Page['getByPlaceholder']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByPlaceholder(text, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByText(text: Parameters<Page['getByText']>[0], options?: Parameters<Page['getByText']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByText(text, options);
    return new ElementController(locator, this.elementControllerOptions);
  }

  getByTitle(text: Parameters<Page['getByTitle']>[0], options?: Parameters<Page['getByTitle']>[1]): ElementController<Locator> {
    const locator = this.locatable.getByTitle(text, options);
    return new ElementController(locator, this.elementControllerOptions);
  }
}
