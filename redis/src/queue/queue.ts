import { AsyncDisposable, AsyncDisposer } from '@common-ts/base/disposable';
import { LockProvider } from '@common-ts/base/lock';
import { Logger } from '@common-ts/base/logger';
import { Job, Queue } from '@common-ts/base/queue';
import { getRandomString } from '@common-ts/base/utils';
import { Serializer } from '@common-ts/base/serializer';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoop, DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import { TypedRedis } from '../typed-redis';

const BLOCK_DURATION = 2500;

export class RedisQueue<T> implements AsyncDisposable, Queue<T> {
  private readonly redis: TypedRedis;
  private readonly disposer: AsyncDisposer;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;
  private readonly hashKey: string;
  private readonly listKey: string;
  private readonly retryAfter: number;
  private readonly maxRetries: number;
  private readonly logger: Logger;
  private readonly retryLoop: DistributedLoop;

  constructor(redis: TypedRedis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider, key: string, retryAfter: number, maxRetries: number, logger: Logger) {
    this.redis = redis;
    this.lockProvider = lockProvider;
    this.distributedLoopProvider = distributedLoopProvider;
    this.hashKey = `${key}:data`;
  }

  async dispose(): Promise<void> {
    return this.disposer.dispose();
  }

  async enqueue(data: T): Promise<Job<T>> {
    const job: Job<T> = {
      id: getRandomString(15),
      data
    };

    const transaction = this.redis.transaction();

    const serializedData = Serializer.serialize(job.data);

    this.redis.hSet(this.hashKey, job.id, serializedData);
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
