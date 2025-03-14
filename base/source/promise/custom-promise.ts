import type { PromiseRejectFunction, PromiseResolveFunction } from './types.js';

export class CustomPromise<T> extends Promise<T> {
  static override readonly [Symbol.species] = Promise;

  protected readonly resolve: PromiseResolveFunction<T>;
  protected readonly reject: PromiseRejectFunction;

  constructor() {
    let _resolve!: PromiseResolveFunction<T>;
    let _reject!: PromiseRejectFunction;

    super((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    this.resolve = _resolve;
    this.reject = _reject;
  }
}
