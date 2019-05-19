import { AsyncDisposable, AsyncDisposer } from '@common-ts/base/disposable';
import { LockProvider } from '@common-ts/base/lock';
import { Logger } from '@common-ts/base/logger';
import { availablePriorities, Job, Priority, Queue } from '@common-ts/base/queue';
import { Serializer } from '@common-ts/base/serializer';
import { compareByValueSelection, createArray, currentTimestamp, getRandomString } from '@common-ts/base/utils';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoop, DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import { dequeueLuaScript } from '../lua';
import { TypedRedis } from '../typed-redis';

const BLOCK_DURATION_SECONDS = 2;
const BLOCK_DURATION_SECONDS_STRING = BLOCK_DURATION_SECONDS.toString();

export class RedisQueue<T> implements AsyncDisposable, Queue<T> {
  private readonly redis: TypedRedis;
  private readonly disposer: AsyncDisposer;
  private readonly lockProvider: LockProvider;
  private readonly distributedLoopProvider: DistributedLoopProvider;
  private readonly dataHashKey: string;
  private readonly dequeueTimestampSortedSetKey: string;
  private readonly listKeys: Map<Priority, string>;
  private readonly listKeysArray: string[];
  private readonly retryAfter: number;
  private readonly maxRetries: number;
  private readonly logger: Logger;
  private readonly retryLoop: DistributedLoop;

  constructor(redis: TypedRedis, lockProvider: LockProvider, distributedLoopProvider: DistributedLoopProvider, key: string, retryAfter: number, maxRetries: number, logger: Logger) {
    this.redis = redis;
    this.lockProvider = lockProvider;
    this.distributedLoopProvider = distributedLoopProvider;
    this.retryAfter = retryAfter;
    this.maxRetries = maxRetries;
    this.logger = logger;

    this.dataHashKey = `queue:${key}:data`;
    this.dequeueTimestampSortedSetKey = `queue:${key}:dequeueTime`;
    this.listKeys = new Map(availablePriorities.map((priority) => [priority, `queue:${key}:jobs:${priority}`]));
    this.listKeysArray = [...this.listKeys.entries()].sort(compareByValueSelection(([priority]) => priority)).map(([, key]) => key);
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

  async dequeue(): Promise<Job<T> | undefined> {
    return this._dequeue(this.redis, '0');
  }

  async dequeueMany(count: number): Promise<Job<T>[]> {
    const pipeline = this.redis.pipeline();
    const promises = createArray(count, () => this.dequeueLua(pipeline, this.dataHashKey, this.dequeueTimestampSortedSetKey, this.listKeysArray, '0'));

    return Promise.all(promises);
  }

  async acknowledge(...jobs: Job<T>[]): Promise<void> {
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
        const job = await this._dequeue(this.redis, BLOCK_DURATION_SECONDS_STRING);

        if (job != undefined) {
          yield job;
        }
      }
    }
    finally {
      deferrer.yield();
    }
  }

  async *getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]> {
    const deferrer = this.disposer.getDeferrer();

    try {
      while (!this.disposer.disposing && !cancellationToken.isSet) {
        const blockJob = await this._dequeue(this.redis, BLOCK_DURATION_SECONDS_STRING);

        if (blockJob == undefined) {
          continue;
        }

        const transaction = this.redis.transaction();

        const [_scriptLoadReply, ...unfilteredJobs] = await Promise.all<any>([
          transaction.scriptLoad(dequeueLuaScript),
          ...createArray(size - 1, () => this._dequeue(transaction, '0')),
          transaction.execute().then(() => undefined)
        ]) as [string, ...(Job<T> | undefined)[]];

        const jobs = unfilteredJobs.filter((job) => job != undefined) as Job<T>[];
        jobs.push(blockJob);

        if (jobs.length > 0) {
          yield jobs;
        }
      }
    }
    finally {
      deferrer.yield();
    }
  }

  async _dequeue(redis: TypedRedis, blockDurationSecondsString: string): Promise<Job<T> | undefined> {
    return this.dequeueLua(redis, this.dataHashKey, this.dequeueTimestampSortedSetKey, this.listKeysArray, blockDurationSecondsString);
  }

  private async dequeueLua(redis: TypedRedis, dataHashKey: string, dequeueTimestampSortedSetKey: string, listKeys: string[], blockDurationSecondsString: string): Promise<Job<T>> {
    const timestampString = currentTimestamp().toString();

    const serializedJob = await redis.evaluate<string | null>(dequeueLuaScript, [dequeueTimestampSortedSetKey, dataHashKey, ...listKeys], [blockDurationSecondsString, timestampString]) as string;
    const job = Serializer.deserialize<Job<T>>(serializedJob);

    return job;
  }
}
