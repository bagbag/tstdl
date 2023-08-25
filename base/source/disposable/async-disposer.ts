import { isDefined } from '#/utils/type-guards.js';
import { MultiError } from '../error/multi.error.js';
import type { ReadonlyCancellationToken } from '../utils/cancellation-token.js';
import { CancellationToken } from '../utils/cancellation-token.js';
import type { AsyncDisposable, Disposable } from './disposable.js';
import { dispose, disposeAsync, isAsyncDisposable, isDisposable } from './disposable.js';

const deferrerToken: unique symbol = Symbol('DeferrerToken');

export type AsyncDisposeTaskFunction = () => any;

export type AsyncDisposeHandler = AsyncDisposeTaskFunction | Disposable | AsyncDisposable;

export type AsyncDisposeTask = {
  taskFunction: AsyncDisposeTaskFunction
};

export type Deferrer = {
  [deferrerToken]: CancellationToken,
  yield(): void
};

export class AsyncDisposer implements AsyncDisposable {
  private readonly deferrers: Set<Deferrer>;
  private readonly tasks: AsyncDisposeTask[];

  readonly _disposingToken: CancellationToken;
  readonly _disposedToken: CancellationToken;

  get disposingToken(): ReadonlyCancellationToken {
    return this._disposingToken;
  }

  get disposedToken(): ReadonlyCancellationToken {
    return this._disposedToken;
  }

  get disposing(): boolean {
    return this._disposingToken.isSet;
  }

  get disposed(): boolean {
    return this._disposedToken.isSet;
  }

  constructor() {
    this.deferrers = new Set();
    this.tasks = [];
    this._disposingToken = new CancellationToken();
    this._disposedToken = new CancellationToken();
  }

  getDeferrer(): Deferrer {
    const deferrer: Deferrer = {
      [deferrerToken]: new CancellationToken(),
      yield: () => {
        deferrer[deferrerToken].set();
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

  /**
   *
   * @param fnOrDisposable
   */
  add(fnOrDisposable: AsyncDisposeHandler): void {
    const fn = isAsyncDisposable(fnOrDisposable)
      ? async () => fnOrDisposable[disposeAsync]()
      : isDisposable(fnOrDisposable)
        ? () => fnOrDisposable[dispose]()
        : fnOrDisposable;

    this.tasks.push({ taskFunction: fn });
  }

  async dispose(): Promise<void> {
    if (this.disposing) {
      return this._disposedToken.$set;
    }

    this._disposingToken.set();

    const errors: Error[] = [];

    for (const deferrer of this.deferrers) {
      try {
        await deferrer[deferrerToken];
      }
      catch (error: unknown) {
        errors.push(error as Error);
      }
    }

    for (let i = this.tasks.length - 1; i >= 0; i--) {
      try {
        const task = this.tasks[i]!;
        await task.taskFunction();
      }
      catch (error) {
        errors.push(error as Error);
      }
    }

    const error = (errors.length == 1)
      ? errors[0]!
      : (errors.length > 1)
        ? new MultiError(errors, 'dispose errors')
        : undefined;

    if (isDefined(error)) {
      this._disposedToken.error(error);
      throw error;
    }

    this._disposedToken.set();
  }

  async [disposeAsync](): Promise<void> {
    return this.dispose();
  }
}
