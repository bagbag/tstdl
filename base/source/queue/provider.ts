import type { ObjectLiteral } from '#/types.js';
import type { Queue, QueueConfig } from './queue.js';

export abstract class QueueProvider {
  abstract get<T extends ObjectLiteral>(key: string, config?: QueueConfig): Queue<T>;
}
