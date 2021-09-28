import { MultiError } from '../error/multi.error';
import { DeferredPromise } from '../promise';
import { CancellationToken } from '../utils';
import { parallelForEach } from '../utils/async-iterable-helpers/parallel';
import type { AsyncDisposable, Disposable } from './disposable';
import { dispose, disposeAsync, isAsyncDisposable, isDisposable } from './disposable';

const deferrerPromiseSymbol: unique symbol = Symbol('DeferrerPromise');

export type Task = () => any | Promise<any>;

export type Deferrer = {
  [deferrerPromiseSymbol]: DeferredPromise,
  yield(): void
};

export class AsyncDisposer implements AsyncDisposable {
  private readonly deferrers: Set<Deferrer>;
  private readonly tasks: Set<Task>;

  readonly disposingToken: CancellationToken;
  readonly disposedToken: CancellationToken;

  get disposing(): boolean {
    return this.disposingToken.isSet;
  }

  get disposed(): boolean {
    return this.disposedToken.isSet;
  }

  constructor() {
    this.deferrers = new Set();
    this.tasks = new Set();
    this.disposingToken = new CancellationToken();
    this.disposedToken = new CancellationToken();
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
      const result = await func();
      return result;
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
      return this.disposedToken;
    }

    this.disposingToken.set();

    const errors: Error[] = [];

    for (const deferrer of this.deferrers) {
      try {
        await deferrer[deferrerPromiseSymbol];
      }
      catch (error: unknown) {
        errors.push(error as Error);
      }
    }

    await parallelForEach(this.tasks, 10, async (task) => {
      try {
        await task();
      }
      catch (error: unknown) {
        errors.push(error as Error);
      }
    });

    this.disposedToken.set();

    if (errors.length == 1) {
      throw errors[0];
    }

    if (errors.length > 1) {
      throw new MultiError(errors, 'dispose errors');
    }
  }
}
