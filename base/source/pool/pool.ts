import { ArrayList } from '#/data-structures';
import { Set } from '#/data-structures/set';
import type { AsyncDisposable } from '#/disposable/disposable';
import { disposeAsync } from '#/disposable/disposable';
import { cpus } from 'os';
import { firstValueFrom, race } from 'rxjs';

export type PoolOptions = {
  /**
   * maximum number of instances
   * @default number of cpu cores
   */
  size?: number
};

export type PoolInstanceFactory<T> = () => T | Promise<T>;
export type PoolInstanceDisposer<T> = (instance: T) => void | Promise<void>;

const placeholder = Symbol('pool placeholder');

export class Pool<T> implements AsyncDisposable {
  private readonly size: number;
  private readonly freeInstances: ArrayList<T>;
  private readonly usedInstances: Set<T>;
  private readonly factory: PoolInstanceFactory<T>;
  private readonly disposer: PoolInstanceDisposer<T>;

  private disposed: boolean;

  get length(): number {
    return this.freeInstances.size + this.usedInstances.size;
  }

  constructor(factory: PoolInstanceFactory<T>, disposer: PoolInstanceDisposer<T>, options?: PoolOptions) {
    this.size = options?.size ?? cpus().length;
    this.factory = factory;
    this.disposer = disposer;

    this.freeInstances = new ArrayList();
    this.usedInstances = new Set();
    this.disposed = false;
  }

  async dispose(): Promise<void> {
    return this[disposeAsync]();
  }

  async [disposeAsync](): Promise<void> {
    this.disposed = true;

    while (this.freeInstances.size > 0) {
      const instance = this.freeInstances.removeFirst();
      await this.disposer(instance);
    }

    for (const instance of this.usedInstances) {
      if ((instance as any)[placeholder] != true) {
        await this.disposer(instance);
      }

      this.usedInstances.delete(instance);
    }
  }

  // eslint-disable-next-line max-lines-per-function, max-statements
  async use<R>(handler: (instance: T) => R | Promise<R>): Promise<R> {
    let instance: T;

    if (this.freeInstances.hasItems) {
      instance = this.freeInstances.removeFirst();
    }
    else {
      if (this.length >= this.size) {
        await firstValueFrom(race(this.freeInstances.change$, this.usedInstances.change$));
        return this.use(handler);
      }

      const tempInstance = { [placeholder]: true } as unknown as T;
      this.usedInstances.add(tempInstance);

      try {
        instance = await this.factory();

        if (this.disposed) {
          await this.disposer(instance);
          throw new Error('Pool was disposed.');
        }
      }
      finally {
        this.usedInstances.delete(tempInstance);
      }
    }

    this.usedInstances.add(instance);

    try {
      const result = await handler(instance);
      return result;
    }
    catch (error) {
      try {
        await this.disposer(instance);
      }
      finally {
        this.usedInstances.delete(instance);
      }

      throw error;
    }
    finally {
      this.usedInstances.delete(instance);
      this.freeInstances.add(instance);
    }
  }
}
