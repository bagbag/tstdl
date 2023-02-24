import type { Queue, QueueConfig } from './queue.js';

export abstract class QueueProvider {
  abstract get<T>(key: string, config?: QueueConfig): Queue<T>;
}
