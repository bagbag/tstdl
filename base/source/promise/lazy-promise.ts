import { isPromiseLike } from '#/utils/type-guards.js';
import type { PromiseExecutor, PromiseRejectFunction, PromiseResolveFunction } from './types.js';

export class LazyPromise<T> extends Promise<T> {
  static readonly [Symbol.species] = Promise;

  #resolve: PromiseResolveFunction<T>;
  #reject: PromiseRejectFunction;
  #executed = false;

  readonly #executorOrPromiseProvider: PromiseExecutor<T> | (() => PromiseLike<T>);

  readonly [Symbol.toStringTag] = 'LazyPromise';

  constructor(executorOrPromiseProvider: PromiseExecutor<T> | (() => PromiseLike<T>)) {
    let _resolve!: PromiseResolveFunction<T>;
    let _reject!: PromiseRejectFunction;

    super((resolve, reject) => {
      _resolve = resolve;
      _reject = reject;
    });

    this.#resolve = _resolve;
    this.#reject = _reject;

    this.#executorOrPromiseProvider = executorOrPromiseProvider;
  }

  override async then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
    this.execute();
    return super.then(onfulfilled, onrejected);
  }

  override async catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
    this.execute();
    return super.catch(onrejected);
  }

  override async finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    this.execute();
    return super.finally(onfinally);
  }

  private execute(): void {
    if (this.#executed) {
      return;
    }

    this.#executed = true;

    const result = this.#executorOrPromiseProvider(this.#resolve, this.#reject);

    if (isPromiseLike(result)) {
      this.#resolve(result);
    }
  }
}
