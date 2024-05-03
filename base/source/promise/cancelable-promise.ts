import { CancellationToken, type CancellationSignal } from '#/cancellation/token.js';
import { CustomPromise } from './custom-promise.js';
import type { PromiseRejectFunction, PromiseResolveFunction } from './types.js';

export type CancelablePromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void, cancellationSignal: CancellationSignal) => void;

export type CancelablePromiseResult<T, R> =
  | { canceled: true, reason: R }
  | { canceled: false, value: T };

export class CancelablePromise<T, R = void> extends CustomPromise<CancelablePromiseResult<T, R>> {
  readonly #cancellationToken = new CancellationToken();
  readonly #resolve: PromiseResolveFunction<CancelablePromiseResult<T, R>>;
  readonly #reject: PromiseRejectFunction;

  #pending = true;

  constructor(executor: CancelablePromiseExecutor<T>) {
    super();

    this.#resolve = (value) => {
      if (this.#pending) {
        this.resolve(value);
        this.#pending = false;
      }
    };

    this.#reject = (reason) => {
      if (this.#pending) {
        this.reject(reason);
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
