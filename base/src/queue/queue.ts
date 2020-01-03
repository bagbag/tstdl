import { CancellationToken } from '../utils';

export type Job<T> = {
  id: string,
  data: T
};

export interface Queue<T> {
  enqueue(data: T): Promise<Job<T>>;
  enqueueMany(data: T[]): Promise<Job<T>[]>;

  dequeue(): Promise<Job<T> | undefined>;
  dequeueMany(count: number): Promise<Job<T>[]>;

  acknowledge(jobs: Job<T> | Job<T>[]): Promise<void>;

  getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>>;
  getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]>;
}
