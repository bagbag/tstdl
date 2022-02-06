import { MultiKeyMap } from '#/data-structures/multi-key-map';

/**
 * memoizes a function with an arbitrary number of parameters. If you only need a single parameter, {@link memoizeSingle} is faster
 * @param fn function memoize
 * @returns memoized function
 */export function memoize<Fn extends (...parameters: any[]) => any>(fn: Fn): Fn {
  const cache = new MultiKeyMap<any, any>();

  function memoized(...parameters: Parameters<Fn>): any {
    if (cache.has(parameters)) {
      return cache.get(parameters)!;
    }

    const result = fn(...parameters);
    cache.set(parameters, result);

    return result;
  }

  return memoized as Fn;
}

/**
 * memoizes a function with a single parameter. Faster than {@link memoize}
 * @param fn function memoize
 * @returns memoized function
 */
export function memoizeSingle<Fn extends (parameter: any) => any>(fn: Fn): Fn {
  const cache = new Map<any, any>();

  function memoized(parameter: any): any {
    if (cache.has(parameter)) {
      return cache.get(parameter)!;
    }

    const result = fn(parameter);
    cache.set(parameter, result);

    return result;
  }

  return memoized as Fn;
}
