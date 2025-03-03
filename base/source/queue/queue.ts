import type { CancellationSignal } from '#/cancellation/token.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { Logger } from '#/logger/logger.js';
import { isDefined, isFunction } from '#/utils/type-guards.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import { QueueEnqueueBatch } from './enqueue-batch.js';

export type ProcessWorker<T> = (job: Job<T>) => void | Promise<void>;
export type ProcessBatchWorker<T> = (jobs: Job<T>[]) => void | Promise<void>;

export type JobTag = string | null;

export type Job<T> = {
  id: string,

  /**
   * The lower the number, the higher the priority.
   * @default 1000
   */
  priority: number,

  tag: JobTag,
  data: T
};

export const defaultJobPriority = 1000;

export enum UniqueTagStrategy {
  KeepOld = 0,
  TakeNew = 1
}

export type EnqueueOptions = {
  tag?: JobTag,
  priority?: number
};

export type EnqueueOneOptions = {
  tag?: JobTag,
  uniqueTag?: UniqueTagStrategy,
  priority?: number
};

export type EnqueueManyItem<T> = EnqueueOptions & {
  data: T
};

export type EnqueueManyOptions = {
  uniqueTag?: UniqueTagStrategy,
  returnJobs?: boolean
};

export type QueueConfig = {
  processTimeout?: number,
  maxTries?: number
};

export type QueueArgument = string | (QueueConfig & { name: string });

export const defaultQueueConfig: Required<QueueConfig> = {
  processTimeout: millisecondsPerMinute,
  maxTries: 3
};

export abstract class Queue<T> implements Resolvable<QueueArgument> {
  declare readonly [resolveArgumentType]: QueueArgument;

  batch(): QueueEnqueueBatch<T> {
    return new QueueEnqueueBatch(this);
  }

  abstract enqueue(data: T, options?: EnqueueOneOptions): Promise<Job<T>>;

  abstract enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions & { returnJobs?: false }): Promise<void>;
  abstract enqueueMany(items: EnqueueManyItem<T>[], options: EnqueueManyOptions & { returnJobs: true }): Promise<Job<T>[]>;
  abstract enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions): Promise<Job<T>[] | undefined>;

  abstract has(id: string): Promise<boolean>;

  abstract countByTag(tag: JobTag): Promise<number>;

  abstract get(id: string): Promise<Job<T> | undefined>;
  abstract getByTag(tag: JobTag): Promise<Job<T>[]>;

  abstract cancel(id: string): Promise<void>;
  abstract cancelMany(ids: string[]): Promise<void>;
  abstract cancelByTag(tag: JobTag): Promise<void>;
  abstract cancelByTags(tags: JobTag[]): Promise<void>;

  abstract dequeue(): Promise<Job<T> | undefined>;
  abstract dequeueMany(count: number): Promise<Job<T>[]>;

  abstract acknowledge(job: Job<T>): Promise<void>;
  abstract acknowledgeMany(jobs: Job<T>[]): Promise<void>;

  abstract getConsumer(cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>>;
  abstract getBatchConsumer(size: number, cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>[]>;

  process({ concurrency = 1, cancellationSignal }: { concurrency?: number, cancellationSignal: CancellationSignal }, handler: ProcessWorker<T>, errorHandler?: Logger | ((error: unknown) => void | Promise<void>)): void {
    const handleError = isFunction(errorHandler)
      ? errorHandler
      : isDefined(errorHandler)
        ? (error: unknown) => errorHandler.error(error)
        : undefined;

    for (let i = 0; i < concurrency; i++) {
      void this.processWorker(cancellationSignal, handler, handleError);
    }
  }

  processBatch({ batchSize = 10, concurrency = 1, cancellationSignal }: { batchSize?: number, concurrency?: number, cancellationSignal: CancellationSignal }, handler: ProcessBatchWorker<T>, errorHandler?: Logger | ((error: unknown) => void | Promise<void>)): void {
    const handleError = isFunction(errorHandler)
      ? errorHandler
      : isDefined(errorHandler)
        ? (error: unknown) => errorHandler.error(error)
        : undefined;

    for (let i = 0; i < concurrency; i++) {
      void this.processBatchWorker(batchSize, cancellationSignal, handler, handleError);
    }
  }

  private async processWorker(cancellationSignal: CancellationSignal, handler: ProcessWorker<T>, errorHandler: ((error: unknown) => void | Promise<void>) | undefined) {
    for await (const job of this.getConsumer(cancellationSignal)) {
      try {
        await handler(job);
        await this.acknowledge(job);
      }
      catch (error) {
        await errorHandler?.(error);
      }
    }
  }

  private async processBatchWorker(size: number, cancellationSignal: CancellationSignal, handler: ProcessBatchWorker<T>, errorHandler: ((error: unknown) => void | Promise<void>) | undefined) {
    for await (const jobs of this.getBatchConsumer(size, cancellationSignal)) {
      try {
        await handler(jobs);
        await this.acknowledgeMany(jobs);
      }
      catch (error) {
        await errorHandler?.(error);
      }
    }
  }
}
