import type { PromiseExecutor } from './types.js';

export const enum PromiseState {
  Pending = 0,
  Resolved = 1,
  Rejected = 2
}

export class DeferredPromise<T = void> extends Promise<T> {
  private backingPromise: Promise<T>;
  private resolvePromise: (value: T | PromiseLike<T>) => void;
  private rejectPromise: (reason?: any) => void;

  private state: PromiseState;

  override readonly [Symbol.toStringTag] = 'DeferredPromise';

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

  constructor(executor?: PromiseExecutor<T>) {
    super(() => { /* noop */ });

    this.reset();

    if (executor != undefined) {
      executor((value) => this.resolve(value), (reason) => this.reject(reason));
    }
  }

  override async then<TResult1 = T, TResult2 = never>(onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null | undefined, onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null | undefined): Promise<TResult1 | TResult2> {
    return this.backingPromise.then(onfulfilled, onrejected);
  }

  override async catch<TResult = never>(onrejected?: ((reason: any) => TResult | PromiseLike<TResult>) | null | undefined): Promise<T | TResult> {
    return this.backingPromise.catch(onrejected);
  }

  override async finally(onfinally?: (() => void) | null | undefined): Promise<T> {
    return this.backingPromise.finally(onfinally);
  }

  resolve(value: T | PromiseLike<T>): void {
    this.ensurePendingState();

    this.resolvePromise(value);
    this.state = PromiseState.Resolved;
  }

  resolveAndReset(value: T | PromiseLike<T>): void {
    this.resolve(value);
    this.reset();
  }

  reject(reason?: unknown): void {
    this.ensurePendingState();

    this.rejectPromise(reason);
    this.state = PromiseState.Rejected;
  }

  reset(): void {
    this.backingPromise = new Promise<T>((resolve, reject) => {
      this.resolvePromise = resolve;
      this.rejectPromise = reject;
    });

    this.state = PromiseState.Pending;
  }

  private ensurePendingState(): void {
    if (this.resolved) {
      throw new Error('Promise already resolved.');
    }

    if (this.rejected) {
      throw new Error('Promise already rejected.');
    }
  }
}
