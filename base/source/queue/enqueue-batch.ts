import type { EnqueueManyItem, EnqueueOptions, Job, Queue } from './queue';

interface QueueEnqueueBatchMethods<T> {
  add(...args: Parameters<Queue<T>['enqueue']>): void;
  enqueue(): ReturnType<Queue<T>['enqueueMany']>;
}

export class QueueEnqueueBatch<T> implements QueueEnqueueBatchMethods<T> {
  private readonly queue: Queue<T>;

  private items: EnqueueManyItem<T>[];

  constructor(queue: Queue<T>) {
    this.queue = queue;

    this.items = [];
  }

  add(data: T, options?: EnqueueOptions): void {
    this.items.push({ data, ...options });
  }

  async enqueue(returnJobs?: false): Promise<void>;
  async enqueue(returnJobs: true): Promise<Job<T>[]>;
  async enqueue(returnJobs?: boolean): Promise<void | Job<T>[]> {
    const items = this.items;
    this.items = [];

    const result = await this.queue.enqueueMany(items, returnJobs);
    return result;
  }
}
