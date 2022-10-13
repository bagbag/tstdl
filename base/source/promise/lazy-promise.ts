import { lazyProperty } from '#/utils/object';
import { isPromise } from '#/utils/type-guards';

type PromiseExecutor<T> = (resolve: (value: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void;

export class LazyPromise<T> implements Promise<T> {
  static readonly [Symbol.species] = Promise;

  private readonly backingPromise: Promise<T>;

  readonly [Symbol.toStringTag] = 'LazyPromise';

  constructor(executorOrPromiseProvider: () => (Promise<T> | PromiseExecutor<T>)) {
    lazyProperty(this as any as { backingPromise: Promise<T> }, 'backingPromise', async () => {
      const providedValue = executorOrPromiseProvider();

      if (isPromise(providedValue)) {
        return providedValue;
      }

      return new Promise(providedValue);
    });
  }

  async then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
    return this.backingPromise.then(onfulfilled, onrejected);
  }

  async catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
    return this.backingPromise.catch(onrejected);
  }

  async finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.backingPromise.finally(onfinally);
  }
}
