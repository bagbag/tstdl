import { isFunction } from '#/utils/type-guards.js';

export const dispose: typeof Symbol.dispose = Symbol.dispose;
export const disposeAsync: typeof Symbol.asyncDispose = Symbol.asyncDispose;

export interface Disposable {
  [Symbol.dispose](): void;
}

export interface AsyncDisposable {
  [Symbol.asyncDispose](): PromiseLike<void>;
}

export function isDisposable(object: any): object is Disposable {
  return isFunction((object as Disposable | undefined)?.[Symbol.dispose]);
}

export function isAsyncDisposable(object: any): object is AsyncDisposable {
  return isFunction((object as AsyncDisposable | undefined)?.[Symbol.asyncDispose]);
}

export function isSyncOrAsyncDisposable(object: any): object is Disposable | AsyncDisposable {
  return isFunction((object as Disposable | undefined)?.[Symbol.dispose] ?? (object as AsyncDisposable | undefined)?.[Symbol.asyncDispose]);
}
