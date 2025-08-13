import { IterableWeakMap } from '#/data-structures/iterable-weak-map.js';
import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import { createAccessorDecorator } from '#/reflection/index.js';
import type { Constructor } from '#/types/index.js';
import { assertDefinedPass, isDefined } from '../type-guards.js';

export type MemoizeOptions = {
  /** Use WeakMap instead of Map for caching. Can be used with object parameters only */
  weak?: boolean,
};

/**
 * Memoizes a function with an arbitrary number of parameters. If you only need a single parameter, {@link memoizeSingle} is faster
 * @param fn function memoize
 * @returns memoized function
 */export function memoize<Fn extends (...parameters: any[]) => any>(fn: Fn, options: MemoizeOptions = {}): Fn {
  const cache = new MultiKeyMap<any, any>((options.weak ?? false) ? () => new IterableWeakMap() : undefined);
  const name = getMemoizedName(fn);

  return {
    [name](...parameters: Parameters<Fn>): any {
      if (cache.has(parameters)) {
        return cache.get(parameters)!;
      }

      const result = fn.call(this, ...parameters);
      cache.set(parameters, result);

      return result;
    },
  }[name] as Fn;
}

/**
 * Memoizes a function with a single parameter. Faster than {@link memoize}
 * @param fn function memoize
 * @returns memoized function
 */
export function memoizeSingle<Fn extends (parameter: any) => any>(fn: Fn, options: MemoizeOptions = {}): Fn {
  const cache = (options.weak ?? false) ? new IterableWeakMap() : new Map<any, any>();
  const name = getMemoizedName(fn);

  return {
    [name](parameter: any): any {
      if (cache.has(parameter)) {
        return cache.get(parameter)!;
      }

      const result = fn.call(this, parameter);
      cache.set(parameter, result);

      return result;
    },
  }[name] as Fn;
}

export function memoizeClass<T extends Constructor>(type: T, options: MemoizeOptions = {}): (...parameters: ConstructorParameters<T>) => InstanceType<T> {
  return memoize((...parameters: ConstructorParameters<T>) => new type(...parameters), options);
}

export function memoizeClassSingle<T extends Constructor<any, [any]>>(type: T, options: MemoizeOptions = {}): (...parameters: ConstructorParameters<T>) => InstanceType<T> {
  return memoizeSingle((parameter: ConstructorParameters<T>[0]) => new type(parameter), options);
}

/**
 * Memoizes an accessor (getter)
 *
 * @example
 * ```typescript
 * class MyClass {
 *   @Memoize()
 *   get myValue() {
 *     // expensive calculation
 *     return 123;
 *   }
 * }
 * ```
 *
 * @remarks
 * The getter will be called only once for each instance of the class.
 */
export function Memoize() {
  const cache = new WeakMap<object>();

  return createAccessorDecorator({
    handler: (data) => {
      const getter = assertDefinedPass(data.descriptor.get, 'Memoize requires an getter for accessors.'); // eslint-disable-line @typescript-eslint/unbound-method
      const setter = data.descriptor.set; // eslint-disable-line @typescript-eslint/unbound-method

      function cachedGetter(this: object) {
        if (cache.has(this)) {
          return cache.get(this); // eslint-disable-line @typescript-eslint/no-unsafe-return
        }

        const value = getter.call(this);
        cache.set(this, value);

        return value; // eslint-disable-line @typescript-eslint/no-unsafe-return
      }

      function cachedSetter(this: object, value: any) {
        setter?.call(this, value);
        cache.delete(this);
      }

      return {
        get: cachedGetter,
        set: isDefined(setter) ? cachedSetter : undefined,
      };
    },
  });
}

function getMemoizedName(fn: (...args: any[]) => any): string {
  return `memoized${fn.name[0]?.toUpperCase() ?? ''}${fn.name.slice(1)}`;
}
