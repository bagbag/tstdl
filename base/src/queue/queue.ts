import { CancellationToken } from '../utils/cancellation-token';

export type Job<T> = {
  id: string,
  priority: Priority,
  data: T
};

export enum Priority {
  Critical,
  High,
  Normal,
  Low
}

export const availablePriorities = Object.values(Priority).filter((value) => typeof value == 'number') as Priority[];

export interface Queue<T> {
  enqueue(data: T, priority?: Priority): Promise<Job<T>>;
  enqueueMany(data: T[], priority?: Priority): Promise<Job<T>[]>;

  dequeue(): Promise<Job<T> | undefined>;
  dequeueMany(count: number): Promise<Job<T>[]>;

  acknowledge(jobs: Job<T> | Job<T>[]): Promise<void>;

  getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>>;
  getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]>;
}
