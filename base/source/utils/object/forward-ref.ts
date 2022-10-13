/* eslint-disable @typescript-eslint/no-unsafe-argument, @typescript-eslint/ban-types */

import { propertyReflectMethods, reflectMethods } from '../proxy';
import { assert, isDefined, isUndefined } from '../type-guards';
import type { LazyInitializerItem } from './lazy-property';
import { lazyObject } from './lazy-property';

declare const isForwardRef: unique symbol;

type ForwardRefContext<T extends object = object> = {
  reference: T | undefined
};

const contexts = new WeakMap<any, ForwardRefContext>();

export type ForwardRefOptions<T extends object = object> = {
  reference?: T,
  initializer?: () => T
};

export type ForwardRef<T extends object = object> = T & { [isForwardRef]: true };

// eslint-disable-next-line @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention
export const ForwardRef = {
  create<T extends object>(options?: ForwardRefOptions<T>): ForwardRef<T> {
    const context = getContext(options);
    const forwardRef = getForwardRefProxy<T>(context);
    contexts.set(forwardRef, context);

    return forwardRef;
  },

  isForwardRef<T extends object = object>(value: any): value is ForwardRef<T> {
    return contexts.has(value);
  },

  hasRef<T extends object>(forwardRef: ForwardRef<T> | T): boolean {
    const reference = contexts.get(forwardRef)?.reference;
    return isDefined(reference);
  },

  deref<T extends object>(forwardRef: ForwardRef<T> | T): T {
    assert(ForwardRef.isForwardRef(forwardRef), 'provided value is not a ForwardRef');
    assert(ForwardRef.hasRef(forwardRef), 'ForwardRef has no reference');

    return contexts.get(forwardRef)!.reference as T;
  },

  tryDeref<T extends object>(forwardRef: ForwardRef<T> | T): T | undefined {
    assert(ForwardRef.isForwardRef(forwardRef), 'provided value is not a ForwardRef');

    return contexts.get(forwardRef) as T | undefined;
  },

  setRef<T extends object>(forwardRef: ForwardRef<T> | T, reference: T | undefined): void {
    assert(ForwardRef.isForwardRef(forwardRef), 'provided value is not a ForwardRef');

    contexts.get(forwardRef)!.reference = reference;
  }
};

function getForwardRefProxy<T extends object>(context: ForwardRefContext): ForwardRef<T> {
  function forwardRef(): void { /* noop */ }

  const handler: ProxyHandler<T> = {};

  for (const method of reflectMethods) {
    handler[method] = {
      [method](_originalTarget: T, ...args: any[]): any { // eslint-disable-line @typescript-eslint/no-loop-func
        if (isUndefined(context.reference)) {
          const message = propertyReflectMethods.has(method)
            ? `cannot forward "${method}" to property "${(args[0] as PropertyKey).toString()}" on a ForwardRef which has no reference`
            : `cannot forward "${method}" on a ForwardRef which has no reference`;

          throw new Error(message);
        }

        return (Reflect[method] as Function)(context.reference, ...args);
      }
    }[method];
  }

  return new Proxy(forwardRef as any, handler) as ForwardRef<T>;
}

function getContext(options?: ForwardRefOptions): ForwardRefContext {
  const reference: LazyInitializerItem<ForwardRefContext, 'reference'>
    = isDefined(options?.reference)
      ? { value: options?.reference }
      : isDefined(options?.initializer)
        ? { initializer: options?.initializer }
        : { value: undefined };

  return lazyObject<ForwardRefContext>({
    reference
  });
}
