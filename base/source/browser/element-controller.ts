import type { ElementHandle, Locator } from 'playwright';

import type { Merge, NonUndefinable, TypedOmit } from '#/types/index.js';
import { isDefined, isString, isUndefined } from '#/utils/type-guards.js';
import { resolveValueOrProvider } from '#/utils/value-or-provider.js';
import type { ActionDelayOptions, Delay, TimeoutOptions } from './types.js';
import { assertLocator, assertLocatorPass, delay, isLocator, prepareAction } from './utils.js';

export type TypeDelayOptions = {
  typeDelay?: Delay
};

export type ClickDelayOptions = {
  clickDelay?: Delay
};

export type ElementControllerOptions = {
  actionDelay?: Delay,
  typeDelay?: Delay
};

type LocatorOptions<K extends keyof Locator, I extends keyof Parameters<Locator[K]>> = NonUndefinable<Parameters<Locator[K]>[I]>;

type Methods =
  | 'isVisible'
  | 'isHidden'
  | 'isEnabled'
  | 'isDisabled'
  | 'isChecked'
  | 'isEditable'
  | 'fill'
  | 'type'
  | 'press'
  | 'check'
  | 'uncheck'
  | 'setChecked'
  | 'selectOption'
  | 'setInputFiles'
  | 'click'
  | 'hover'
  | 'focus'
  | 'tap'
  | 'selectText'
  | 'inputValue';

export type Filter = {
  has?: ElementController,
  hasNot?: ElementController,
  hasText?: string | RegExp,
  hasNotText?: string | RegExp
};

export type BoundingBox = {
  x: number,
  y: number,
  width: number,
  height: number
};

const requiresLocatorBasedController = 'Requires a locator based controller';

export class ElementController<T extends Locator | ElementHandle = Locator | ElementHandle> implements Pick<Locator, Methods> {
  readonly locatorOrHandle: T;
  readonly options: ElementControllerOptions;

  constructor(locatorOrHandle: T, options: ElementControllerOptions = {}) {
    this.locatorOrHandle = locatorOrHandle;
    this.options = options;
  }

  async getAll(): Promise<ElementController<Locator>[]> {
    if (!isLocator(this.locatorOrHandle)) {
      throw new Error('getAll only works with Locator');
    }

    const locators = await this.locatorOrHandle.all();
    return locators.map((locator) => new ElementController(locator));
  }

  async getAllHandles(): Promise<ElementController<ElementHandle>[]> {
    if (!isLocator(this.locatorOrHandle)) {
      throw new Error('getAllHandles only works with Locator');
    }

    const handles = await this.locatorOrHandle.elementHandles();
    return handles.map((handle) => new ElementController(handle));
  }

  /**
   * Get an controller with elements contained in this and the provided controller.
   * Requires locator based controller
   * @param elementController
   */
  and(elementController: ElementController): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);
    assertLocator(elementController.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.and(elementController.locatorOrHandle);
    return new ElementController(locator, this.options);
  }

  /**
   * Get an controller with elements contained in this and the provided controller.
   * Requires locator based controller
   * @param elementController
   */
  or(elementController: ElementController): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);
    assertLocator(elementController.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.or(elementController.locatorOrHandle);
    return new ElementController(locator, this.options);
  }

  /**
   * Filter out elements with by provided filter.
   * Requires locator based controller.
   */
  filter(filter: Filter): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.filter(convertFilter(filter));
    return new ElementController(locator, this.options);
  }

  /**
   * Locate elements in subtree with provided selector/controller and filter.
   * Requires locator based controller.
   */
  locate(selectorOrController: string | ElementController, filter?: Filter): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);

    const selector = isString(selectorOrController) ? selectorOrController : assertLocatorPass(selectorOrController.locatorOrHandle, requiresLocatorBasedController);
    const convertedFilter = isDefined(filter) ? convertFilter(filter) : undefined;

    const locator = this.locatorOrHandle.locator(selector, convertedFilter);
    return new ElementController(locator, this.options);
  }

  first(): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.first();
    return new ElementController(locator, this.options);
  }

  last(): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.last();
    return new ElementController(locator, this.options);
  }

  nth(index: number): ElementController<Locator> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);

    const locator = this.locatorOrHandle.nth(index);
    return new ElementController(locator, this.options);
  }

  async evaluate<R, A>(fn: string | ((element: SVGElement | HTMLElement, argument: A) => R | Promise<R>), argument: A): Promise<R>;
  async evaluate<R, A>(fn: string | ((element: SVGElement | HTMLElement, argument?: A) => R | Promise<R>), argument?: A): Promise<R>;
  async evaluate<R, A>(fn: string | ((element: SVGElement | HTMLElement, argument: A) => R | Promise<R>), argument?: A): Promise<R> {
    if (isLocator(this.locatorOrHandle)) {
      return this.locatorOrHandle.evaluate(fn as any, argument);
    }

    return this.locatorOrHandle.evaluate(fn as any, argument);
  }

  /**
   * Wait for element state
   * @param state some states may only be usable for either locator or handle
   * @param options options
   */
  async waitFor(state: Parameters<ElementHandle['waitForElementState']>[0] | NonNullable<LocatorOptions<'waitFor', '0'>['state']> = 'visible', options?: Parameters<ElementHandle['waitForElementState']>[1]): Promise<void> {
    if (isLocator(this.locatorOrHandle)) {
      return this.locatorOrHandle.waitFor({ state: state as LocatorOptions<'waitFor', '0'>['state'], ...options });
    }

    return this.locatorOrHandle.waitForElementState(state as Parameters<ElementHandle['waitForElementState']>[0], options);
  }

  async boundingBox(options?: TimeoutOptions): Promise<BoundingBox | null> {
    return this.locatorOrHandle.boundingBox({ timeout: options?.timeout ?? 1000 });
  }

  async scrollIntoViewIfNeeded(options?: TimeoutOptions): Promise<void> {
    await this.locatorOrHandle.scrollIntoViewIfNeeded({ timeout: options?.timeout ?? 1000 });
  }

  /**
   * Counts matching elements for locator based or returns 1 for handle based.
   */
  async count(): Promise<number> {
    return isLocator(this.locatorOrHandle) ? this.locatorOrHandle.count() : 1;
  }

  /**
   * Check if element exists
   * @param options.state which state is required in order to be deemed existing
   * @param options.timeout how long to wait for the element before being deemed not existing (default: 250ms)
   */
  async exists(options?: { state?: 'visible' | 'attached' } & TimeoutOptions): Promise<boolean> {
    try {
      await this.waitFor(options?.state ?? 'visible', { timeout: options?.timeout ?? 1000 });
      return true;
    }
    catch (error) {
      if ((error instanceof Error) && error.message.includes('violation')) {
        throw error;
      }

      return false;
    }
  }

  async isVisible(): Promise<boolean> {
    return this.locatorOrHandle.isVisible();
  }

  async isHidden(): Promise<boolean> {
    return this.locatorOrHandle.isHidden();
  }

  async isEnabled(): Promise<boolean> {
    return this.locatorOrHandle.isEnabled();
  }

  async isDisabled(): Promise<boolean> {
    return this.locatorOrHandle.isDisabled();
  }

  async isChecked(): Promise<boolean> {
    return this.locatorOrHandle.isChecked();
  }

  async isEditable(): Promise<boolean> {
    return this.locatorOrHandle.isEditable();
  }

  async clear(options?: Merge<LocatorOptions<'clear', 1>, ActionDelayOptions>): Promise<void> {
    assertLocator(this.locatorOrHandle, requiresLocatorBasedController);
    await prepareAction(options);
    await this.locatorOrHandle.clear(options);
  }

  async fill(text: string, options?: Merge<LocatorOptions<'fill', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.fill(text, options);
  }

  async type(text: string, options?: Merge<TypedOmit<LocatorOptions<'type', 1>, 'delay'>, ActionDelayOptions & TypeDelayOptions>): Promise<void> {
    await prepareAction(options);

    if (isUndefined(this.options.typeDelay)) {
      await this.locatorOrHandle.type(text, options);
    }
    else {
      for (const char of text) {
        await this.locatorOrHandle.type(char, options);
        await delay(options?.typeDelay ?? this.options.typeDelay);
      }
    }
  }

  async press(key: string, options?: Merge<LocatorOptions<'press', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.press(key, options);
  }

  async check(options?: Merge<LocatorOptions<'check', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.check(options);
  }

  async uncheck(options?: Merge<LocatorOptions<'uncheck', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.uncheck(options);
  }

  async setChecked(checked: boolean, options?: Merge<LocatorOptions<'setChecked', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.setChecked(checked, options);
  }

  async selectOption(option: string | string[], options?: Merge<LocatorOptions<'selectOption', 1>, ActionDelayOptions>): Promise<string[]> {
    await prepareAction(options);
    const selectedOptions = await this.locatorOrHandle.selectOption(option, options);
    return selectedOptions;
  }

  async setInputFiles(files: LocatorOptions<'setInputFiles', 0>, options?: Merge<LocatorOptions<'setInputFiles', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.setInputFiles(files, options);
  }

  async click(options?: Merge<TypedOmit<LocatorOptions<'click', 0>, 'delay'>, ActionDelayOptions & ClickDelayOptions>): Promise<void> {
    await prepareAction(options);

    await this.locatorOrHandle.click({
      ...options,
      delay: resolveValueOrProvider(options?.clickDelay)
    });
  }

  async dblclick(options?: Merge<TypedOmit<LocatorOptions<'click', 0>, 'delay'>, ActionDelayOptions & ClickDelayOptions>): Promise<void> {
    await prepareAction(options);

    await this.locatorOrHandle.dblclick({
      ...options,
      delay: resolveValueOrProvider(options?.clickDelay)
    });
  }

  async hover(options?: Merge<LocatorOptions<'hover', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.hover(options);
  }

  async focus(options?: Merge<LocatorOptions<'focus', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.focus(options);
  }

  async tap(options?: Merge<LocatorOptions<'tap', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.tap(options);
  }

  async selectText(options?: Merge<LocatorOptions<'selectText', 1>, ActionDelayOptions>): Promise<void> {
    await prepareAction(options);
    await this.locatorOrHandle.selectText(options);
  }

  async inputValue(options?: LocatorOptions<'inputValue', 0>): Promise<string> {
    return this.locatorOrHandle.inputValue(options);
  }
}

function convertFilter(filter: Filter): NonUndefinable<Parameters<Locator['filter']>[0]> {
  return {
    has: isDefined(filter.has) ? assertLocatorPass(filter.has.locatorOrHandle, requiresLocatorBasedController) : undefined,
    hasNot: isDefined(filter.hasNot) ? assertLocatorPass(filter.hasNot.locatorOrHandle, requiresLocatorBasedController) : undefined,
    hasText: filter.hasText,
    hasNotText: filter.hasNotText
  };
}
