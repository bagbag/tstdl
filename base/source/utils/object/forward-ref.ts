/* eslint-disable @typescript-eslint/no-dynamic-delete, @typescript-eslint/no-unsafe-member-access, @typescript-eslint/no-unsafe-return, @typescript-eslint/ban-types, @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-argument */

import { noop } from '../helpers';
import { isDefined, isFunction } from '../type-guards';

export const getRef: unique symbol = Symbol('ForwardRef.getRef');
export const setRef = Symbol('ForwardRef.setRef');

const isForwardRef = Symbol('ForwardRef.isForwardRef');

export type ForwardRefOptions<T extends object> = {
  reference?: T,
  initializer?: () => T
};

export class ForwardRef<T extends object> {
  constructor(options?: ForwardRefOptions<T>) {
    // eslint-disable-next-line no-constructor-return
    return getForwardRefProxy(options);
  }

  static create<T extends object>(options?: ForwardRefOptions<T>): ForwardRef<T> & T {
    const forwardReference = new ForwardRef(options) as (ForwardRef<T> & T);
    return forwardReference;
  }

  static isForwardRef<T extends object = object>(value: any): value is (ForwardRef<T> & T) {
    return isFunction(value) && (isForwardRef in value);
  }

  [getRef](): this {
    throw new Error('that\'s a bug or invalid usage! This should not happen...');
  }

  [setRef](reference: T): this;
  [setRef](): this {
    throw new Error('that\'s a bug or invalid usage! This should not happen...');
  }
}

// eslint-disable-next-line max-lines-per-function
function getForwardRefProxy<T extends object>(options: ForwardRefOptions<T> = {}): ForwardRef<T> {
  const { reference: initialReference, initializer } = options;

  let reference: any;
  let initialized = false;

  let initialize = (): void => {
    if (!initialized && isDefined(initializer)) {
      refSetter(initializer());
    }

    initialize = noop;
  };

  function forwardRefProxy(): void { /* noop */ }

  const proxy = new Proxy(forwardRefProxy as any, {
    apply(_target: T, _thisArg: any, args: any[]): any {
      initialize();
      return new reference(...args);
    },
    construct(_target: T, args: any[], newTarget: Function): object {
      initialize();

      const instance = new reference(...args);
      Object.setPrototypeOf(instance, newTarget.prototype);

      return instance;
    },
    defineProperty(_target: T, property: string | symbol, attributes: PropertyDescriptor): boolean {
      initialize();
      return Object.defineProperty(reference, property, attributes);
    },
    deleteProperty(_target: T, property: string | symbol): boolean {
      initialize();
      return (delete reference[property]);
    },
    get(_target: T, property: string | symbol, _receiver: any): any {
      initialize();

      switch (property) {
        case getRef:
          return refGetter;

        case setRef:
          return refSetter;

        default:
          return reference?.[property];
      }
    },
    getOwnPropertyDescriptor(_target: T, property: string | symbol): PropertyDescriptor | undefined {
      initialize();
      return Object.getOwnPropertyDescriptor(reference, property);
    },
    getPrototypeOf(_target: T): object | null {
      initialize();
      return Object.getPrototypeOf(reference);
    },
    has(_target: T, property: string | symbol): boolean {
      initialize();

      if (property == isForwardRef) {
        return true;
      }

      return property in reference;
    },
    isExtensible(_target: T): boolean {
      initialize();
      return Object.isExtensible(reference);
    },
    ownKeys(_target: T): ArrayLike<string | symbol> {
      initialize();
      return Reflect.ownKeys(reference);
    },
    preventExtensions(_target: T): boolean {
      initialize();
      return Object.preventExtensions(reference);
    },
    set(_target: T, property: string | symbol, value: any, _receiver: any): boolean {
      initialize();
      return (reference[property] = value);
    },
    setPrototypeOf(_target: T, value: object | null): boolean {
      initialize();
      return Object.setPrototypeOf(reference, value);
    }
  });

  function refGetter(): any {
    return reference;
  }

  function refSetter(newReference: T): ForwardRef<T> {
    reference = newReference;
    initialized = true;
    return proxy;
  }

  if (isDefined(initialReference)) {
    refSetter(initialReference);
  }

  return proxy;
}
