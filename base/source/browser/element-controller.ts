import type { Merge, NonUndefinable, TypedOmit } from '#/types.js';
import { timeout } from '#/utils/timing.js';
import { assertNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import type { ValueOrProvider } from '#/utils/value-or-provider.js';
import { resolveValueOrProvider } from '#/utils/value-or-provider.js';
import type { ElementHandle, Locator } from 'playwright';
import { PageController } from './page-controller.js';
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

export class ElementController {
  readonly locatorOrHandle: Locator | ElementHandle;
  readonly pageController: PageController;
  readonly options: ElementControllerOptions;

  constructor(locatorOrHandle: Locator | ElementHandle, pageController: PageController, options: ElementControllerOptions = {}) {
    this.locatorOrHandle = locatorOrHandle;
    this.pageController = pageController;
    this.options = options;
  }

  async waitFor(options?: Parameters<Locator['waitFor']>[0]): Promise<void> {
    return (this.locatorOrHandle as Locator).waitFor(options);
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

  /**
   * Get PageController for element. Element must be a frame.
   */
  async getPage(options?: LocatorOptions<'elementHandle', 0>): Promise<PageController> {
    const handle = isLocator(this.locatorOrHandle)
      ? await this.locatorOrHandle.elementHandle(options)
      : this.locatorOrHandle;

    if (isNull(handle)) {
      throw new Error('Could not get element handle.');
    }

    const frame = await (this.locatorOrHandle as ElementHandle).contentFrame();
    assertNotNull(frame, 'Could not get content frame for element handle.');

    return new PageController(frame.page(), this.pageController.options);
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
