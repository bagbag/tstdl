import type { ElementHandle, Locator } from 'playwright';

import type { Merge, NonUndefinable, TypedOmit } from '#/types.js';
import { timeout } from '#/utils/timing.js';
import { isUndefined } from '#/utils/type-guards.js';
import type { ValueOrProvider } from '#/utils/value-or-provider.js';
import { resolveValueOrProvider } from '#/utils/value-or-provider.js';
import { isLocator } from './utils.js';

export type Delay = ValueOrProvider<number>;

export type ActionDelayOptions = {
  actionDelay?: Delay
};

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

export class ElementController<T extends Locator | ElementHandle = Locator | ElementHandle> {
  readonly locatorOrHandle: T;
  readonly options: ElementControllerOptions;

  constructor(locatorOrHandle: T, options: ElementControllerOptions = {}) {
    this.locatorOrHandle = locatorOrHandle;
    this.options = options;
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

  /**
   * Check if element exists
   * @param options.state which state is required in order to be deemed existing
   * @param options.timeout how long to wait for the element before being deemed not existing (default: 250ms)
   */
  async exists(options?: { state?: 'visible' | 'attached', timeout?: number }): Promise<boolean> {
    try {
      await this.waitFor(options?.state ?? 'visible', { timeout: options?.timeout ?? 250 });
      return true;
    }
    catch {
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

  async fill(text: string, options?: Merge<LocatorOptions<'fill', 1>, ActionDelayOptions>): Promise<void> {
    await this.prepareAction(options);
    await this.locatorOrHandle.fill(text, options);
  }

  async type(text: string, options?: Merge<TypedOmit<LocatorOptions<'type', 1>, 'delay'>, ActionDelayOptions & TypeDelayOptions>): Promise<void> {
    await this.prepareAction(options);

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

  async selectOption(value: string | string[], options?: Merge<LocatorOptions<'selectOption', 1>, ActionDelayOptions>): Promise<void> {
    await this.prepareAction(options);
    await this.locatorOrHandle.selectOption(value, options);
  }

  async click(options?: Merge<TypedOmit<LocatorOptions<'click', 0>, 'delay'>, ActionDelayOptions & ClickDelayOptions>): Promise<void> {
    await this.prepareAction(options);

    await this.locatorOrHandle.click({
      ...options,
      delay: resolveValueOrProvider(options?.clickDelay)
    });
  }

  async getValue(options?: LocatorOptions<'inputValue', 0>): Promise<string> {
    return this.locatorOrHandle.inputValue(options);
  }

  private async prepareAction(options?: ActionDelayOptions): Promise<void> {
    await delay(options?.actionDelay ?? this.options.actionDelay);
  }
}

async function delay(milliseconds: Delay | undefined): Promise<void> {
  if (isUndefined(milliseconds)) {
    return;
  }

  await timeout(resolveValueOrProvider(milliseconds));
}
