import { compareByValueSelection } from '#/utils/comparison.js';
import { group } from '#/utils/iterable-helpers/group.js';
import { sort } from '#/utils/iterable-helpers/sort.js';
import { isDefined } from '#/utils/type-guards.js';
import { MultiError } from '../error/multi.error.js';
import { parallelForEach } from '../utils/async-iterable-helpers/parallel/for-each.js';
import type { ReadonlyCancellationToken } from '../utils/cancellation-token.js';
import { CancellationToken } from '../utils/cancellation-token.js';
import type { AsyncDisposable, Disposable } from './disposable.js';
import { dispose, disposeAsync, isAsyncDisposable, isDisposable } from './disposable.js';

const deferrerToken: unique symbol = Symbol('DeferrerToken');

export type TaskFunction = () => any;

export type AsyncDisposeHandler = TaskFunction | Disposable | AsyncDisposable;

export type Task = {
  priority: number,
  taskFunction: TaskFunction
};

export type Deferrer = {
  [deferrerToken]: CancellationToken,
  yield(): void
};

export class AsyncDisposer implements AsyncDisposable {
  private readonly deferrers: Set<Deferrer>;
  private readonly tasks: Task[];

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
   * @param priority when it will be disposed in relation to other tasks (lower gets disposed first). When other tasks have the same priority, they will be disposed in parallel
   */
  add(fnOrDisposable: AsyncDisposeHandler, priority: number = 1000): void {
    const fn = isDisposable(fnOrDisposable)
      ? () => fnOrDisposable[dispose]()
      : isAsyncDisposable(fnOrDisposable)
        ? async () => fnOrDisposable[disposeAsync]()
        : fnOrDisposable;

    this.tasks.push({ priority, taskFunction: fn });
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

    const taskGroups = sort(group(this.tasks, (task) => task.priority), compareByValueSelection((task) => task[0]));

    for (const [, tasks] of taskGroups) {
      await parallelForEach(tasks, 10, async (task) => {
        try {
          await task.taskFunction();
        }
        catch (error: unknown) {
          errors.push(error as Error);
        }
      });
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
