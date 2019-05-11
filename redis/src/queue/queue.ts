import { AsyncDisposable, AsyncDisposer } from '@common-ts/base/disposable';
import { LockProvider } from '@common-ts/base/lock';
import { Logger } from '@common-ts/base/logger';
import { Job, Queue, Priority, availablePriorities } from '@common-ts/base/queue';
import { getRandomString, createArray } from '@common-ts/base/utils';
import { Serializer } from '@common-ts/base/serializer';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoop, DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import { TypedRedis } from '../typed-redis';

const BLOCK_DURATION = 2500;

const dequeueLuaScript = `

`.trim();

export class RedisQueue<T> implements AsyncDisposable, Queue<T> {
  private readonly redis: TypedRedis;
  private readonly disposer: AsyncDisposer;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;
  private readonly key: string;
  private readonly dataHashKey: string;
  private readonly listKeys: Map<Priority, string>;
  private readonly retryAfter: number;
  private readonly maxRetries: number;
  private readonly logger: Logger;
  private readonly retryLoop: DistributedLoop;

  constructor(redis: TypedRedis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider, key: string, retryAfter: number, maxRetries: number, logger: Logger) {
    this.redis = redis;
    this.lockProvider = lockProvider;
    this.distributedLoopProvider = distributedLoopProvider;
    this.key = key;
    this.retryAfter = retryAfter;
    this.maxRetries = maxRetries;
    this.logger = logger;

    this.dataHashKey = `queue:${key}:data`;
    this.listKeys = new Map(availablePriorities.map((priority) => [priority, `queue:${key}:jobs:${priority}`]));
  }

  async dispose(): Promise<void> {
    return this.disposer.dispose();
  }

  async enqueue(data: T, priority: Priority = Priority.Normal): Promise<Job<T>> {
    const job: Job<T> = {
      id: getRandomString(15),
      priority,
      data
    };

    const listKey = this.listKeys.get(priority) as string;
    const serializedJob = Serializer.serialize(job);

    const transaction = this.redis.transaction();
    await Promise.all([
      transaction.hSet(this.dataHashKey, job.id, serializedJob),
      transaction.lPush(listKey, [job.id]),
      transaction.execute()
    ]);

    return job;
  }

  async enqueueMany(datas: T[], priority: Priority = Priority.Normal): Promise<Job<T>[]> {
    const ids = createArray(datas.length, () => getRandomString(15));
    const jobs: Job<T>[] = datas.map((data, index) => ({ id: ids[index], priority, data }));

    const listKey = this.listKeys.get(priority) as string;
    const hashEntries = jobs.map((job) => [job.id, Serializer.serialize(job)] as [string, string]);

    const transaction = this.redis.transaction();
    await Promise.all([
      transaction.hSetMany(this.dataHashKey, hashEntries),
      transaction.lPush(listKey, ids),
      transaction.execute()
    ]);

    return jobs;
  }

  async dequeue(): Promise<Job<T>> {

  }

  async dequeueMany(): Promise<Job<T>[]> {

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
