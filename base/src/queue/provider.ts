import type { Queue } from './queue';

export interface QueueProvider {
  get<T>(key: string, retryAfterMilliseconds: number): Queue<T>;
}
