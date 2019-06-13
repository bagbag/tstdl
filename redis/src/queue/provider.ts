import { LockProvider } from '@common-ts/base/lock';
import { Queue, QueueProvider } from '@common-ts/base/queue';
import { DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import { TypedRedis } from '../typed-redis';
import { RedisQueue } from './queue';

export class RedisQueueProvider implements QueueProvider {
  private readonly redis: TypedRedis;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;

  constructor(redis: TypedRedis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider) {
    this.redis = redis;
    this.lockProvider = lockProvider;
    this.distributedLoopProvider = distributedLoopProvider;
  }

  get<T>(key: string, retryAfterMilliseconds: number): Queue<T> {
    return new RedisQueue(this.redis, this.lockProvider, this.distributedLoopProvider, key, retryAfterMilliseconds);
  }
}
