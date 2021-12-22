import type { Queue } from './queue';

export abstract class QueueProvider {
  abstract get<T>(key: string, retryAfterMilliseconds: number): Queue<T>;
}
