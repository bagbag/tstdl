import { IterableWeakMap } from '#/data-structures/iterable-weak-map.js';
import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import type { Constructor } from '#/types.js';

export type MemoizeOptions = {
  /** Use WeakMap instead of Map for caching. Can be used with object parameters only */
  weak?: boolean
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
    }
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
    }
  }[name] as Fn;
}

export function memoizeClass<T extends Constructor>(type: T, options: MemoizeOptions = {}): (...parameters: ConstructorParameters<T>) => InstanceType<T> {
  return memoize((...parameters: ConstructorParameters<T>) => new type(...parameters), options);
}

export function memoizeClassSingle<T extends Constructor<any, [any]>>(type: T, options: MemoizeOptions = {}): (...parameters: ConstructorParameters<T>) => InstanceType<T> {
  return memoizeSingle((parameter: ConstructorParameters<T>[0]) => new type(parameter), options);
}

function getMemoizedName(fn: (...args: any[]) => any): string {
  return `memoized${fn.name[0]?.toUpperCase() ?? ''}${fn.name.slice(1)}`;
}
