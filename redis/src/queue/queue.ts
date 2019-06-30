import { AsyncDisposable, AsyncDisposer, disposeAsync } from '@tstdl/base/disposable';
import { LockProvider } from '@tstdl/base/lock';
import { Job, Queue } from '@tstdl/base/queue';
import { Serializer } from '@tstdl/base/serializer';
import { createArray, currentTimestamp, getRandomString, single, timeout, toArray } from '@tstdl/base/utils';
import { CancellationToken } from '@tstdl/base/utils/cancellation-token';
import { DistributedLoop, DistributedLoopProvider } from '@tstdl/server/distributed-loop';
import { dequeueLuaScript, retryLuaScript } from '../lua';
import { TypedRedis } from '../typed-redis';

const BLOCK_DURATION = 2000;
const RETRY_BATCH_COUNT = 50;

export class RedisQueue<T> implements AsyncDisposable, Queue<T> {
  private readonly redis: TypedRedis;
  private readonly disposer: AsyncDisposer;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;
  private readonly dataHashKey: string;
  private readonly dequeueTimestampSortedSetKey: string;
  private readonly listKey: string;
  private readonly retryAfterMilliseconds: number;
  private readonly retryLoop: DistributedLoop;

  constructor(redis: TypedRedis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider, key: string, retryAfterMilliseconds: number) {
    this.redis = redis;
    this.lockProvider = lockProvider;
    this.distributedLoopProvider = distributedLoopProvider;
    this.retryAfterMilliseconds = retryAfterMilliseconds;

    this.disposer = new AsyncDisposer();
    this.dataHashKey = `queue:${key}:data`;
    this.dequeueTimestampSortedSetKey = `queue:${key}:dequeueTime`;
    this.listKey = `queue:${key}:jobs`;

    const retryLoop = distributedLoopProvider.get(`queue:${key}:retry`);
    const retryLoopController = retryLoop.run(async () => this.retryAll(), 2000, 1000);
    this.disposer.add(() => retryLoopController.stop());
  }

  async [disposeAsync](): Promise<void> {
    return this.disposer[disposeAsync]();
  }

  async enqueue(data: T): Promise<Job<T>> {
    const job: Job<T> = {
      id: getRandomString(15),
      data
    };

    const serializedJob = Serializer.serialize(job);

    const transaction = this.redis.transaction();
    await Promise.all([
      transaction.hSet(this.dataHashKey, job.id, serializedJob),
      transaction.rPush(this.listKey, [job.id]),
      transaction.execute()
    ]);

    return job;
  }

  async enqueueMany(datas: T[]): Promise<Job<T>[]> {
    const ids = createArray(datas.length, () => getRandomString(15));
    const jobs: Job<T>[] = datas.map((data, index) => ({ id: ids[index], data }));

    const hashEntries = jobs.map((job) => [job.id, Serializer.serialize(job)] as [string, string]);

    const transaction = this.redis.transaction();
    await Promise.all([
      transaction.hSetMany(this.dataHashKey, hashEntries),
      transaction.rPush(this.listKey, ids),
      transaction.execute()
    ]);

    return jobs;
  }

  async dequeue(): Promise<Job<T> | undefined> {
    return this._dequeue(this.redis);
  }

  async dequeueMany(count: number): Promise<Job<T>[]> {
    return this._dequeueMany(this.redis, count);
  }

  async acknowledge(jobOrJobs: Job<T> | Job<T>[]): Promise<void> {
    const jobs = toArray(jobOrJobs);
    const transaction = this.redis.transaction();

    const ids = jobs.map((job) => job.id);

    await Promise.all([
      transaction.hDelete(this.dataHashKey, ids),
      transaction.zRemove(this.dequeueTimestampSortedSetKey, ids),
      transaction.execute()
    ]);
  }

  async *getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>> {
    const deferrer = this.disposer.getDeferrer();

    try {
      while (!this.disposer.disposing && !cancellationToken.isSet) {
        const job = await this._dequeue(this.redis);

        if (job != undefined) {
          yield job;
        }
        else {
          await timeout(BLOCK_DURATION);
        }
      }
    }
    finally {
      deferrer.yield();
    }
  }

  async *getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]> {
    const deferrer = this.disposer.getDeferrer();

    let blockDuration = BLOCK_DURATION;

    try {
      while (!this.disposer.disposing && !cancellationToken.isSet) {
        const transaction = this.redis.transaction();

        const [jobs] = await Promise.all([
          this._dequeueMany(transaction, size),
          transaction.execute().then(() => undefined)
        ]);

        if (jobs.length > 0) {
          blockDuration = 10;
          yield jobs;
        }
        else {
          await timeout(blockDuration);
          blockDuration = Math.min(blockDuration * 2, BLOCK_DURATION);
        }
      }
    }
    finally {
      deferrer.yield();
    }
  }

  private async retryAll(): Promise<number> {
    let totalRequeuedJobsCount = 0;

    while (true) {
      const requeuedJobsCount = await this.retry();
      totalRequeuedJobsCount += requeuedJobsCount;

      if (requeuedJobsCount != RETRY_BATCH_COUNT) {
        break;
      }
    }

    return totalRequeuedJobsCount;
  }

  private async retry(): Promise<number> {
    const transaction = this.redis.transaction();

    const [requeuedJobsCount] = await Promise.all([
      this._retry(transaction, this.retryAfterMilliseconds, RETRY_BATCH_COUNT),
      transaction.execute().then(() => undefined)
    ]);

    return requeuedJobsCount;
  }

  private async _dequeue(redis: TypedRedis): Promise<Job<T> | undefined> {
    const jobs = await this._dequeueMany(redis, 1);

    if (jobs.length == 0) {
      return undefined;
    }

    return single(jobs);
  }

  private async _dequeueMany(redis: TypedRedis, count: number): Promise<Job<T>[]> {
    return this.dequeueLua(redis, this.listKey, this.dataHashKey, this.dequeueTimestampSortedSetKey, count);
  }

  private async _retry(redis: TypedRedis, retryAfterMilliseconds: number, count: number): Promise<number> {
    const timestamp = currentTimestamp() - retryAfterMilliseconds;
    return this.retryLua(redis, this.listKey, this.dequeueTimestampSortedSetKey, timestamp, count);
  }

  private async dequeueLua(redis: TypedRedis, listKey: string, dataHashKey: string, dequeueTimestampSortedSetKey: string, count: number): Promise<Job<T>[]> {
    const timestampString = currentTimestamp().toString();
    const serializedJobs = await redis.evaluate<string[]>(dequeueLuaScript, [listKey, dataHashKey, dequeueTimestampSortedSetKey], [timestampString, count.toString()]);
    const jobs = serializedJobs.map((serializedJob) => Serializer.deserialize<Job<T>>(serializedJob));

    return jobs;
  }

  private async retryLua(redis: TypedRedis, listKey: string, dequeueTimestampSortedSetKey: string, timestamp: number, count: number): Promise<number> {
    const timestampString = timestamp.toString();
    const requeuedJobsCount = await redis.evaluate<number>(retryLuaScript, [listKey, dequeueTimestampSortedSetKey], [timestampString, count.toString()]);

    return requeuedJobsCount;
  }
}
