import type { CancellationSignal } from '#/cancellation/token.js';
import type { Resolvable } from '#/injector/interfaces.js';
import { resolveArgumentType } from '#/injector/interfaces.js';
import { millisecondsPerMinute } from '#/utils/units.js';
import { QueueEnqueueBatch } from './enqueue-batch.js';

export type JobTag = string | number | null;

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
  uniqueTag?: UniqueTagStrategy,
  priority?: number
};

export type EnqueueManyItem<T> = EnqueueOptions & {
  data: T
};

export type QueueConfig = {
  processTimeout?: number,
  maxTries?: number
};

export type QueueArgument = string | (QueueConfig & { key: string });

export const defaultQueueConfig: Required<QueueConfig> = {
  processTimeout: millisecondsPerMinute,
  maxTries: 3
};

export abstract class Queue<T> implements Resolvable<QueueArgument> {
  declare readonly [resolveArgumentType]: QueueArgument;

  batch(): QueueEnqueueBatch<T> {
    return new QueueEnqueueBatch(this);
  }

  abstract enqueue(data: T, options?: EnqueueOptions): Promise<Job<T>>;
  abstract enqueueMany(items: EnqueueManyItem<T>[], returnJobs?: false): Promise<void>;
  abstract enqueueMany(items: EnqueueManyItem<T>[], returnJobs: true): Promise<Job<T>[]>;
  abstract enqueueMany(items: EnqueueManyItem<T>[], returnJobs?: boolean): Promise<void | Job<T>[]>;

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
}
