import { isDefined, isNullOrUndefined } from '#/utils/type-guards.js';
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

export class AsyncDisposer implements AsyncDisposable, AsyncDisposableStack {
  readonly #disposingToken: CancellationToken;
  readonly #disposedToken: CancellationToken;

  #deferrers: Set<Deferrer>;
  #tasks: AsyncDisposeTask[];

  get disposingToken(): ReadonlyCancellationToken {
    return this.#disposingToken;
  }

  get disposedToken(): ReadonlyCancellationToken {
    return this.#disposedToken;
  }

  get disposing(): boolean {
    return this.#disposingToken.isSet;
  }

  get disposed(): boolean {
    return this.#disposedToken.isSet;
  }

  readonly [Symbol.toStringTag] = 'AsyncDisposable';

  constructor() {
    this.#deferrers = new Set();
    this.#tasks = [];
    this.#disposingToken = new CancellationToken();
    this.#disposedToken = new CancellationToken();
  }

  use<T extends globalThis.AsyncDisposable | globalThis.Disposable | null | undefined>(value: T): T {
    if (isNullOrUndefined(value)) {
      return value;
    }

    this.add(value);
    return value;
  }

  adopt<T>(value: T, onDisposeAsync: (value: T) => void | PromiseLike<void>): T {
    this.add(async () => onDisposeAsync(value));
    return value;
  }

  move(): AsyncDisposableStack {
    const disposer = new AsyncDisposer();
    disposer.#tasks = this.#tasks;
    disposer.#deferrers = this.#deferrers;

    this.#tasks = [];
    this.#deferrers = new Set();

    this.#disposingToken.set();
    this.#disposedToken.set();

    return disposer;
  }

  getDeferrer(): Deferrer {
    const deferrer: Deferrer = {
      [deferrerToken]: new CancellationToken(),
      yield: () => {
        deferrer[deferrerToken].set();
        this.#deferrers.delete(deferrer);
      }
    };

    this.#deferrers.add(deferrer);

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

    this.#tasks.push({ taskFunction: fn });
  }

  async disposeAsync(): Promise<void> {
    await this.dispose();
  }

  async dispose(): Promise<void> {
    if (this.disposing) {
      return this.#disposedToken.$set;
    }

    this.#disposingToken.set();

    const errors: Error[] = [];

    for (const deferrer of this.#deferrers) {
      try {
        await deferrer[deferrerToken];
      }
      catch (error: unknown) {
        errors.push(error as Error);
      }
    }

    for (let i = this.#tasks.length - 1; i >= 0; i--) {
      try {
        const task = this.#tasks[i]!;
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
      this.#disposedToken.error(error);
      throw error;
    }

    this.#disposedToken.set();

    return undefined;
  }

  async [Symbol.asyncDispose](): Promise<void> {
    return this.dispose();
  }
}
