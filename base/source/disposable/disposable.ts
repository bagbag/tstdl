import { isFunction } from '#/utils/type-guards.js';

export function isDisposable(object: any): object is Disposable {
  return isFunction((object as Disposable | undefined)?.[Symbol.dispose]);
}

export function isAsyncDisposable(object: any): object is AsyncDisposable {
  return isFunction((object as AsyncDisposable | undefined)?.[Symbol.asyncDispose]);
}

export function isSyncOrAsyncDisposable(object: any): object is Disposable | AsyncDisposable {
  return isDisposable(object) || isAsyncDisposable(object);
}
