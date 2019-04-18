import { CancellationToken } from '../utils/cancellation-token';

export type Job<T> = {
  id: string,
  data: T
};

export interface Queue<T> {
  enqueue(data: T): Promise<Job<T>>;
  enqueueMany(data: T[]): Promise<Job<T>[]>;

  acknowledge(...jobs: Job<T>[]): Promise<void>;

  getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>>;
  getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]>;
}
