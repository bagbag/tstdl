import type { IfUnknown } from '#/types';
import { isDefined, isFunction, isNullOrUndefined, isObject } from '../type-guards';
import { filterObject, hasOwnProperty } from './object';

const lazyObjectValueSymbol = Symbol('LazyObjectValue');

export type LazyPropertyInitializer<T, K extends keyof T> = (this: T, key: K) => T[K];

export type LazyPropertyObjectDefinition<T extends object, P extends keyof T> = LazyPropertyDescriptor & {
  /** define property with existing value */
  value?: T[P],

  /** define property with getter */
  get?: (this: T) => T[P],

  /** define property with setter */
  set?: (this: T, value: T[P]) => void,

  /** lazily define property with initializer */
  initializer?: LazyPropertyInitializer<T, P>
};

export type LazyObjectValue<T> = { [lazyObjectValueSymbol]: typeof lazyObjectValueSymbol, value: T };

export type LazyInitializerItem<T extends object, P extends keyof T> =
  | Exclude<IfUnknown<T[P], never, T[P]>, Function | object>
  | LazyPropertyInitializer<T, P>
  | LazyPropertyObjectDefinition<T, P>
  | LazyObjectValue<T[P]>;

export type LazyPropertyDescriptor = {
  /**
   * true if the type of this property descriptor may be changed and if the property may be deleted from the corresponding object
   * @default true
   */
  configurable?: boolean,

  /**
   * true if and only if this property shows up during enumeration of the properties on the corresponding object
   * @default true
   */
  enumerable?: boolean,

  /**
   * true if the value associated with the property may be changed with an assignment operator
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
        _value = initializer.call(object, propertyKey);
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

// eslint-disable-next-line max-statements, max-lines-per-function
export function lazyObject<T extends object>(initializers: { [P in keyof T]: LazyInitializerItem<T, P> }): T {
  const object = {} as unknown as T;

  for (const [key, value] of Object.entries(initializers) as [keyof T, LazyInitializerItem<T, any>][]) {
    const valueIsFunction = isFunction(value);
    const valueIsObject = isObject(value);

    if ((!valueIsFunction && !valueIsObject) || isNullOrUndefined(value)) {
      object[key] = value;
      continue;
    }

    if (valueIsFunction) {
      lazyProperty(object, key, value);
      continue;
    }

    const definition = (isLazyObjectValue(value))
      ? { value: value.value }
      : value;

    const hasGetOrSet = hasOwnProperty(definition, 'get') || hasOwnProperty(definition, 'set');
    const hasInitializer = hasOwnProperty(definition, 'initializer');
    const hasValue = hasOwnProperty(definition, 'value');

    if ((Number(hasGetOrSet) + Number(hasInitializer) + Number(hasValue)) != 1) {
      throw new Error(`exactly one of value, initializer or get/set must be provided for key "${key as string}", but got none or multiple`);
    }

    const descriptor: LazyPropertyDescriptor = {
      configurable: definition.configurable,
      enumerable: definition.enumerable,
      writable: definition.writable
    };

    if (hasInitializer) {
      lazyProperty<T, keyof T>(object, key, definition.initializer!, descriptor);
      continue;
    }

    if (hasValue) {
      object[key] = definition.value!;
      continue;
    }

    if (hasGetOrSet) {
      Object.defineProperty(object, key, { get: definition.get, set: definition.set, configurable: true, enumerable: true, ...filterObject(descriptor, isDefined) });
      continue;
    }
  }

  return object;
}

export function lazyObjectValue<T>(value: T): LazyObjectValue<T> {
  return { [lazyObjectValueSymbol]: lazyObjectValueSymbol, value };
}

export function isLazyObjectValue<T>(value: any): value is LazyObjectValue<T> {
  return isObject(value) && (value as LazyObjectValue<T>)[lazyObjectValueSymbol] == lazyObjectValueSymbol;
}
