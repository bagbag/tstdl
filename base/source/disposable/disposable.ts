import { isFunction } from '#/utils/type-guards.js';

export const dispose: unique symbol = Symbol('dispose');
export const disposeAsync: unique symbol = Symbol('disposeAsync');

export interface Disposable {
  [dispose](): void;
}

export interface AsyncDisposable {
  [disposeAsync](): Promise<void>;
}

export function isDisposable(object: any): object is Disposable {
  return isFunction((object as Disposable | undefined)?.[dispose]);
}

export function isAsyncDisposable(object: any): object is AsyncDisposable {
  return isFunction((object as AsyncDisposable | undefined)?.[disposeAsync]);
}
