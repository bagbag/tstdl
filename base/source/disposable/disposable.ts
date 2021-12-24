import { isFunction, isObject } from '#/utils/type-guards';

export const dispose: unique symbol = Symbol('dispose');
export const disposeAsync: unique symbol = Symbol('disposeAsync');

export interface Disposable {
  [dispose](): void;
}

export interface AsyncDisposable {
  [disposeAsync](): Promise<void>;
}

export function isDisposable(object: any): object is Disposable {
  return isObject(object) && isFunction((object as Disposable)[dispose]);
}

export function isAsyncDisposable(object: any): object is AsyncDisposable {
  return isObject(object) && isFunction((object as AsyncDisposable)[disposeAsync]);
}
