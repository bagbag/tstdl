import type { Primitive } from '#/types';
import { isFunction, isObject } from '../type-guards';

export type LazyPropertyInitializer<T, K extends keyof T> = (key: K) => T[K];

export type LazyInitializerItem<T extends object, P extends keyof T> =
  | T[P] & Primitive
  | LazyPropertyInitializer<T, P>
  | {
    initializer: LazyPropertyInitializer<T, P>,
    descriptor?: LazyPropertyDescriptor
  };

export type LazyPropertyDescriptor = {
  /**
   * @default true
   */
  configurable?: boolean,

  /**
   * @default true
   */
  enumerable?: boolean,

  /**
   * @default true
   */
  writable?: boolean
};

/**
 *
 * @param object object to define lazy property on
 * @param propertyKey property key
 * @param initializer
 * @param descriptor
 */
export function lazyProperty<T extends object, K extends keyof T>(object: T, propertyKey: K, initializer: LazyPropertyInitializer<T, K>, descriptor: LazyPropertyDescriptor = {}): void {
  const { configurable = true, enumerable = true, writable = true } = descriptor;

  let initialized = false;
  let _value: T[K];

  Object.defineProperty(object, propertyKey, {
    get() {
      if (!initialized) {
        _value = initializer(propertyKey);
        initialized = true;
      }

      if (configurable) {
        Object.defineProperty(object, propertyKey, { configurable, enumerable, writable, value: _value });
      }

      return _value;
    },
    set: !writable ? undefined
      : function set(value: T[K]) {
        if (configurable) {
          Object.defineProperty(object, propertyKey, { configurable, enumerable, writable, value });
        }

        _value = value;
        initialized = true;
      },
    enumerable,
    configurable
  });
}

export function lazyObject<T extends object>(initializers: { [P in keyof T]: LazyInitializerItem<T, P> }): T {
  const object = {} as unknown as T;

  for (const [key, value] of Object.entries(initializers) as [keyof T, LazyInitializerItem<T, any>][]) {
    const valueIsFunction = isFunction(value);
    const valueIsObject = isObject(value);

    if (!valueIsFunction && !valueIsObject) {
      object[key] = value;
      continue;
    }

    const initializer = valueIsFunction ? value : value.initializer;
    const descriptor = valueIsFunction ? {} : value.descriptor;

    lazyProperty<T, keyof T>(object, key, initializer, descriptor);
  }

  return object;
}
