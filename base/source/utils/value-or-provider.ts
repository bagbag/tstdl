import { isFunction } from './type-guards.js';

export type Provider<T> = () => T;
export type AsyncProvider<T> = () => (T | Promise<T>);

export type ValueOrProvider<T> = T | Provider<T>;
export type ValueOrAsyncProvider<T> = T | Provider<T> | AsyncProvider<T>;
export type ResolvedValueOrProvider<T extends ValueOrAsyncProvider<any>> = T extends ValueOrAsyncProvider<infer U> ? U : never;

export function resolveValueOrProvider<T>(valueOrProvider: ValueOrProvider<T>): T {
  if (isFunction(valueOrProvider)) {
    return valueOrProvider();
  }

  return valueOrProvider;
}

/**
 * @deprecated use {@link resolveValueOrAsyncProvider}
 */
export async function resolveAsyncValueOrProvider<T>(valueOrProvider: ValueOrAsyncProvider<T>): Promise<T> {
  return resolveValueOrAsyncProvider(valueOrProvider);
}

export async function resolveValueOrAsyncProvider<T>(valueOrProvider: ValueOrAsyncProvider<T>): Promise<T> {
  if (isFunction(valueOrProvider)) {
    return (valueOrProvider as AsyncProvider<T>)();
  }

  return valueOrProvider;
}

/**
 * @deprecated use {@link cacheValueOrAsyncProvider}
 */

export function cacheAsyncValueOrProvider<T>(provider: ValueOrAsyncProvider<T>): () => (T | Promise<T>) {
  return cacheValueOrAsyncProvider(provider);
}

export function cacheValueOrAsyncProvider<T>(provider: ValueOrAsyncProvider<T>): () => (T | Promise<T>) {
  let getValue: () => T | Promise<T> = async () => {
    const valuePromise = resolveValueOrAsyncProvider(provider);

    getValue = async () => valuePromise;
    void valuePromise.then((resolvedValue) => (getValue = () => resolvedValue));

    return valuePromise;
  };

  return async () => getValue();
}
