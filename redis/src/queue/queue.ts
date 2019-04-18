import { AsyncDisposable, AsyncDisposer } from '@common-ts/base/disposable';
import { LockProvider } from '@common-ts/base/lock';
import { Logger } from '@common-ts/base/logger';
import { Job, Queue } from '@common-ts/base/queue';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoop, DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import { Redis } from 'ioredis';
import { uniqueId } from '@common-ts/server/utils';

const BLOCK_DURATION = 2500;
const MINIMUM_CONSUMER_IDLE_TIME_BEFORE_DELETION = 600000;

export class RedisQueue<T> implements AsyncDisposable, Queue<T> {
  private readonly redis: Redis;
  private readonly disposer: AsyncDisposer;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;
  private readonly key: string;
  private readonly hashKey: string;
  private readonly listKey: string;
  private readonly streamName: string;
  private readonly groupName: string;
  private readonly retryAfter: number;
  private readonly maxRetries: number;
  private readonly logger: Logger;
  private readonly retryLoop: DistributedLoop;
  private readonly consumerDeleteLoop: DistributedLoop;

  constructor(redis: Redis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider, key: string, retryAfter: number, maxRetries: number, logger: Logger) {
    this.redis = redis;
  }

  async dispose(): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async enqueue(data: T): Promise<Job<T>> {
    const job: Job<T> = {
      id: await uniqueId(15),
      data
    };

    this.redis.hset(this.hashKey, job.id, job.data)
    this.redis.rpush(this.listKey);
  }

  async enqueueMany(data: T[]): Promise<Job<T>[]> {
    throw new Error("Method not implemented.");
  }

  async acknowledge(...jobs: Job<T>[]): Promise<void> {
    throw new Error("Method not implemented.");
  }

  async *getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>> {
    throw new Error("Method not implemented.");
  }

  async *getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]> {
    throw new Error("Method not implemented.");
  }
}
