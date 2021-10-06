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
export function lazyProperty<T extends object, K extends keyof T>(object: T, propertyKey: K, initializer: (key: K) => T[K], descriptor: LazyPropertyDescriptor = {}): void {
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

lazyProperty(globalThis as any, 'name', () => 'Patrick', {});

console.log(Object.entries(globalThis));
