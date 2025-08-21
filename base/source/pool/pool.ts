import { ArrayList } from '#/data-structures/array-list.js';
import { SetCollection } from '#/data-structures/set-collection.js';
import { hardwareConcurrency } from '#/environment.js';
import type { Logger } from '#/logger/index.js';
import { isDefined } from '#/utils/type-guards.js';

export type PoolOptions = {

  /**
   * Maximum number of instances
   * @default number of cpu cores
   */
  size?: number,

  /**
   * Dipose used instance on error instead of reusing it.
   * @default false
   */
  disposeOnError?: boolean,
};

export type PoolUseOptions = {

  /**
   * Dipose used instance on error instead of reusing it. Overwrites pool instance option
   * @default false
   */
  disposeOnError?: boolean,
};

export type PoolInstanceFactory<T> = () => T | Promise<T>;
export type PoolInstanceDisposer<T> = (instance: T) => any | Promise<any>;

export class Pool<T extends object> implements AsyncDisposable {
  private readonly size: number;
  private readonly disposeOnError: boolean;
  private readonly freeInstances: ArrayList<T>;
  private readonly usedInstances: SetCollection<T>;
  private readonly factory: PoolInstanceFactory<T>;
  private readonly disposer: PoolInstanceDisposer<T>;
  private readonly logger: Logger;

  private placeholderInstances: number;
  private disposed: boolean;

  get length(): number {
    return this.freeInstances.size + this.usedInstances.size + this.placeholderInstances;
  }

  constructor(factory: PoolInstanceFactory<T>, disposer: PoolInstanceDisposer<T>, logger: Logger, options?: PoolOptions) {
    this.size = options?.size ?? (isDefined(hardwareConcurrency) ? (hardwareConcurrency / 2) : 4);
    this.factory = factory;
    this.disposer = disposer;
    this.logger = logger;
    this.disposeOnError = options?.disposeOnError ?? false;

    this.freeInstances = new ArrayList();
    this.usedInstances = new SetCollection();
    this.placeholderInstances = 0;
    this.disposed = false;
  }

  owns(instance: T): boolean {
    return this.usedInstances.includes(instance) || this.freeInstances.includes(instance);
  }

  async get(): Promise<T> {
    if (this.disposed) {
      throw new Error('Pool was disposed.');
    }

    if (this.freeInstances.hasItems) {
      const instance = this.freeInstances.removeFirst();
      this.usedInstances.add(instance);

      return instance;
    }

    if (this.length < this.size) {
      this.placeholderInstances++;

      try {
        const newInstance = await this.factory();

        if (this.disposed) {
          await this.disposer(newInstance);
          throw new Error('Pool was disposed.');
        }

        this.usedInstances.add(newInstance);
        return newInstance;
      }
      finally {
        this.placeholderInstances--;
      }
    }

    while (!this.freeInstances.hasItems) {
      await this.freeInstances.$onItems;
    }

    return await this.get();
  }

  async release(instance: T): Promise<void> {
    if (this.freeInstances.includes(instance)) {
      throw new Error('Instance is free already.');
    }

    if (!this.usedInstances.has(instance)) {
      throw new Error('Instance is not from this pool.');
    }

    this.usedInstances.delete(instance);
    this.freeInstances.add(instance);
  }

  /**
   * Get an instance from the pool and use it
   * @param handler consumer of instance
   * @returns instance
   */
  async use<R>(handler: (instance: T) => R | Promise<R>, options: PoolUseOptions = {}): Promise<R> {
    const instance = await this.get();

    try {
      const result = await handler(instance);
      await this.release(instance);

      return result;
    }
    catch (error) {
      if (options.disposeOnError ?? this.disposeOnError) {
        try {
          await this.disposeInstance(instance);
        }
        catch (disposeError) {
          this.logger.error(disposeError as Error);
        }
      }
      else {
        await this.release(instance);
      }

      throw error;
    }
  }

  async disposeInstance(instance: T): Promise<void> {
    let index: number | undefined;

    if (this.usedInstances.has(instance)) {
      this.usedInstances.delete(instance);
    }
    else if (isDefined(index = this.freeInstances.indexOf(instance))) {
      this.freeInstances.removeAt(index);
    }
    else {
      throw new Error('Instance is not from this pool.');
    }

    await this.disposer(instance);
  }

  async dispose(): Promise<void> {
    await this[Symbol.asyncDispose]();
  }

  async [Symbol.asyncDispose](): Promise<void> {
    this.disposed = true;

    if (this.length == 0) {
      return;
    }

    while (this.freeInstances.size > 0) {
      const instance = this.freeInstances.removeFirst();
      await this.disposer(instance);
    }

    for (const instance of this.usedInstances) {
      await this.disposer(instance);
      this.usedInstances.delete(instance);
    }
  }
}
