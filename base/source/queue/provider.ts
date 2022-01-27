import type { Queue, QueueConfig } from './queue';

export abstract class QueueProvider {
  abstract get<T>(key: string, config?: QueueConfig): Queue<T>;
}
