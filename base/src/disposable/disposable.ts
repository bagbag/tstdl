export const dispose: unique symbol = Symbol('dispose');
export const disposeAsync: unique symbol = Symbol('disposeAsync');

export interface Disposable {
  [dispose](): void;
}

export interface AsyncDisposable {
  [disposeAsync](): Promise<void>;
}

export function isDisposable(object: any): object is Disposable {
  return (typeof object == 'object') && (typeof (object as Disposable)[dispose] == 'function');
}

export function isAsyncDisposable(object: any): object is AsyncDisposable {
  return (typeof object == 'object') && (typeof (object as AsyncDisposable)[disposeAsync] == 'function');
}
