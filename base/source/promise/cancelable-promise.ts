import { CancellationToken, type CancellationSignal } from '#/cancellation/token.js';
import type { PromiseRejectFunction, PromiseResolveFunction } from './types.js';

export type CancelablePromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void, cancellationSignal: CancellationSignal) => void;

export type CancelablePromiseResult<T, R> =
  | { canceled: true, reason: R }
  | { canceled: false, value: T };

export class CancelablePromise<T, R = void> extends Promise<CancelablePromiseResult<T, R>> {
  #cancellationToken = new CancellationToken();
  #resolve: PromiseResolveFunction<CancelablePromiseResult<T, R>>;
  #reject: PromiseRejectFunction;
  #pending = true;

  constructor(executor: CancelablePromiseExecutor<T>) {
    let _resolve!: PromiseResolveFunction<CancelablePromiseResult<T, R>>;
    let _reject!: PromiseRejectFunction;

    super((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    this.#resolve = (value) => {
      if (this.#pending) {
        _resolve(value);
        this.#pending = false;
      }
    };

    this.#reject = (reason) => {
      if (this.#pending) {
        _reject(reason);
        this.#pending = false;
      }
    };

    executor(
      (value) => this.#resolve(Promise.resolve(value).then((result) => ({ canceled: false, value: result }))),
      this.#reject,
      this.#cancellationToken.signal
    );
  }

  cancel(reason: R): void {
    this.#cancellationToken.set();
    this.#resolve({ canceled: true, reason });
  }
}
