import type { ReadonlyCancellationToken } from '../utils';

export type JobTag = string | number | null;

export type Job<T> = {
  id: string,
  priority: number,
  tag: JobTag,
  data: T
};

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

export interface Queue<T> {
  enqueue(data: T, options?: EnqueueOptions): Promise<Job<T>>;
  enqueueMany(items: EnqueueManyItem<T>[], returnJobs?: false): Promise<void>;
  enqueueMany(items: EnqueueManyItem<T>[], returnJobs: true): Promise<Job<T>[]>;

  has(id: string): Promise<boolean>;

  countByTag(tag: JobTag): Promise<number>;

  get(id: string): Promise<Job<T> | undefined>;
  getByTag(tag: JobTag): Promise<Job<T>[]>;

  cancel(id: string): Promise<void>;
  cancelMany(ids: string[]): Promise<void>;
  cancelByTag(tag: JobTag): Promise<void>;

  dequeue(): Promise<Job<T> | undefined>;
  dequeueMany(count: number): Promise<Job<T>[]>;

  acknowledge(job: Job<T>): Promise<void>;
  acknowledgeMany(jobs: Job<T>[]): Promise<void>;

  getConsumer(cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<Job<T>>;
  getBatchConsumer(size: number, cancellationToken: ReadonlyCancellationToken): AsyncIterableIterator<Job<T>[]>;
}
