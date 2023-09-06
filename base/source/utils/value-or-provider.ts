import { isFunction } from './type-guards.js';

export type Provider<T> = () => T;
export type AsyncProvider<T> = () => (T | Promise<T>);

export type ValueOrProvider<T> = T extends (() => any) ? never : (T | Provider<T>);
export type ValueOrAsyncProvider<T> = T extends (() => any) ? never : (T | Provider<T> | AsyncProvider<T>);
export type ResolvedValueOrProvider<T extends ValueOrAsyncProvider<any>> = T extends ValueOrAsyncProvider<infer U> ? U : never;

export function resolveValueOrProvider<T>(valueOrProvider: ValueOrProvider<T>): T {
  if (isFunction(valueOrProvider)) {
    return (valueOrProvider as Provider<T>)();
  }

  return valueOrProvider as T;
}

export async function resolveAsyncValueOrProvider<T>(valueOrProvider: ValueOrAsyncProvider<T>): Promise<T> {
  if (isFunction(valueOrProvider)) {
    return (valueOrProvider as AsyncProvider<T>)();
  }

  return valueOrProvider as T;
}

export function cacheAsyncValueOrProvider<T>(provider: ValueOrAsyncProvider<T>): () => (T | Promise<T>) {
  let getValue: () => T | Promise<T> = async () => {
    const valuePromise = resolveAsyncValueOrProvider(provider);

    getValue = async () => valuePromise;
    void valuePromise.then((resolvedValue) => (getValue = () => resolvedValue));

    return valuePromise;
  };

  return () => getValue(); // eslint-disable-line @typescript-eslint/promise-function-async
}
