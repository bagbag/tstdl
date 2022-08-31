import { IterableWeakMap } from '#/data-structures';
import { MultiKeyMap } from '#/data-structures/multi-key-map';
import { isDefined } from '../type-guards';

export type MemoizeOptions = {
  /** Use WeakMap instead of Map for caching. Can be used with object parameters only */
  weak?: boolean,
  thisArg?: any
};

/**
 * memoizes a function with an arbitrary number of parameters. If you only need a single parameter, {@link memoizeSingle} is faster
 * @param fn function memoize
 * @returns memoized function
 */export function memoize<Fn extends (...parameters: any[]) => any>(fn: Fn, options: MemoizeOptions = {}): Fn {
  const cache = new MultiKeyMap<any, any>((options.weak ?? false) ? () => new IterableWeakMap() : undefined);
  const name = getMemoizedName(fn);
  const boundFn = isDefined(options.thisArg) ? fn.bind(options.thisArg) : fn;

  return {
    [name](...parameters: Parameters<Fn>): any {
      if (cache.has(parameters)) {
        return cache.get(parameters)!;
      }

      const result = boundFn(...parameters);
      cache.set(parameters, result);

      return result;
    }
  }[name] as Fn;
}

/**
 * memoizes a function with a single parameter. Faster than {@link memoize}
 * @param fn function memoize
 * @returns memoized function
 */
export function memoizeSingle<Fn extends (parameter: any) => any>(fn: Fn, options: MemoizeOptions = {}): Fn {
  const cache = (options.weak ?? false) ? new IterableWeakMap() : new Map<any, any>();
  const name = getMemoizedName(fn);
  const boundFn = isDefined(options.thisArg) ? fn.bind(options.thisArg) : fn;

  return {
    [name](parameter: any): any {
      if (cache.has(parameter)) {
        return cache.get(parameter)!;
      }

      const result = boundFn(parameter);
      cache.set(parameter, result);

      return result;
    }
  }[name] as Fn;
}

function getMemoizedName(fn: (...args: any[]) => any): string {
  return `memoized${fn.name[0]?.toUpperCase() ?? ''}${fn.name.slice(1)}`;
}
