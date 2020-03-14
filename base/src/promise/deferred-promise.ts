const promiseConstructor = Promise;

const enum PromiseState {
  Pending,
  Resolved,
  Rejected
}

export class DeferredPromise<T = void> implements Promise<T> {
  static all = promiseConstructor.all.bind(promiseConstructor);
  static race = promiseConstructor.race.bind(promiseConstructor);
  static resolve = promiseConstructor.resolve.bind(promiseConstructor);
  static reject = promiseConstructor.reject.bind(promiseConstructor);
  static [Symbol.species] = promiseConstructor;

  private backingPromise: Promise<T>;
  private resolvePromise: (value?: T | PromiseLike<T>) => void;
  private rejectPromise: (reason?: any) => void;

  private state: PromiseState;

  readonly [Symbol.toStringTag]: string = 'Promise';

  get resolved(): boolean {
    return this.state == PromiseState.Resolved;
  }

  get rejected(): boolean {
    return this.state == PromiseState.Rejected;
  }

  get pending(): boolean {
    return this.state == PromiseState.Pending;
  }

  get settled(): boolean {
    return this.state != PromiseState.Pending;
  }

  constructor(executor?: (resolve: (value?: T | PromiseLike<T>) => void, reject: (reason?: any) => void) => void) {
    this.reset();

    if (executor != undefined) {
      executor((value) => this.resolve(value), (reason) => this.reject(reason));
    }
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
    return this.backingPromise.then(onfulfilled, onrejected);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
    return this.backingPromise.catch(onrejected);
  }

  // eslint-disable-next-line @typescript-eslint/promise-function-async
  finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.backingPromise.finally(onfinally);
  }

  resolve(value?: T | PromiseLike<T>): void {
    this.ensurePendingState();

    this.resolvePromise(value);
    this.state = PromiseState.Resolved;
  }

  resolveAndReset(value?: T | PromiseLike<T>): void {
    this.resolve(value);
    this.reset();
  }

  reject(reason?: unknown): void {
    this.ensurePendingState();

    this.rejectPromise(reason);
    this.state = PromiseState.Rejected;
  }

  reset(): void {
    this.backingPromise = new promiseConstructor<T>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });

    this.state = PromiseState.Pending;
  }

  private ensurePendingState(): void {
    if (this.resolved) {
      throw new Error('promise already resolved');
    }

    if (this.rejected) {
      throw new Error('promise already rejected');
    }
  }
}
