import { isPromiseLike } from '#/utils/type-guards.js';
import { CustomPromise } from './custom-promise.js';
import type { PromiseExecutor } from './types.js';

export class LazyPromise<T> extends CustomPromise<T> {
  #executed = false;

  readonly #executorOrPromiseProvider: PromiseExecutor<T> | (() => PromiseLike<T>);

  override readonly [Symbol.toStringTag] = 'LazyPromise';

  constructor(executorOrPromiseProvider: PromiseExecutor<T> | (() => PromiseLike<T>)) {
    super();

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

    const result = this.#executorOrPromiseProvider(this.resolve, this.reject);

    if (isPromiseLike(result)) {
      this.resolve(result);
    }
  }
}
