import { MultiError } from '../error/multi-error';
import { DeferredPromise } from '../promise';
import { parallelForEach } from '../utils/async-iterable-helpers/parallel';
import { AsyncDisposable, Disposable, dispose, disposeAsync, isAsyncDisposable, isDisposable } from './disposable';

const deferrerPromiseSymbol: unique symbol = Symbol('DeferrerPromise');

export type Task = () => any | Promise<any>;

export type Deferrer = {
  [deferrerPromiseSymbol]: DeferredPromise,
  yield(): void
};

export class AsyncDisposer implements AsyncDisposable {
  private readonly _disposingPromise: DeferredPromise;
  private readonly disposedPromise: DeferredPromise;
  private readonly deferrers: Set<Deferrer>;
  private readonly tasks: Set<Task>;

  private _disposing: boolean;
  private _disposed: boolean;

  get disposingPromise(): Promise<void> {
    return this._disposingPromise;
  }

  get disposing(): boolean {
    return this._disposing;
  }

  get disposed(): boolean {
    return this._disposed;
  }

  constructor() {
    this.disposedPromise = new DeferredPromise();
    this.deferrers = new Set();
    this.tasks = new Set();

    this._disposingPromise = new DeferredPromise();
    this._disposing = false;
    this._disposed = false;
  }

  getDeferrer(): Deferrer {
    const deferredPromise = new DeferredPromise();
    const deferrer: Deferrer = {
      [deferrerPromiseSymbol]: deferredPromise,
      yield: () => {
        deferredPromise.resolve();
        this.deferrers.delete(deferrer);
      }
    };

    this.deferrers.add(deferrer);

    return deferrer;
  }

  async defer<T>(func: () => Promise<T>): Promise<T> {
    const deferrer = this.getDeferrer();

    try {
      return await func();
    }
    finally {
      deferrer.yield();
    }
  }

  add(...tasks: (Task | Disposable | AsyncDisposable)[]): void {
    for (const task of tasks) {
      if (isDisposable(task)) {
        this.tasks.add(() => task[dispose]());
      }
      else if (isAsyncDisposable(task)) {
        this.tasks.add(async () => task[disposeAsync]());
      }
      else {
        this.tasks.add(task);
      }
    }
  }

  // eslint-disable-next-line max-statements
  async [disposeAsync](): Promise<void> {
    if (this.disposing) {
      await this.disposedPromise;
      return;
    }

    this._disposing = true;
    this._disposingPromise.resolve();

    const errors: Error[] = [];

    for (const deferrer of this.deferrers) {
      try {
        await deferrer[deferrerPromiseSymbol];
      }
      catch (error) {
        errors.push(error as Error);
      }
    }

    await parallelForEach(this.tasks, 10, async (task) => {
      try {
        await task();
      }
      catch (error) {
        errors.push(error as Error);
      }
    });

    this._disposed = true;
    this.disposedPromise.resolve();

    if (errors.length == 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new MultiError(errors, 'dispose errors');
    }
  }
}
