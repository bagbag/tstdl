import type { CancellationSignal } from '#/cancellation/index.js';
import { CancellationToken } from '#/cancellation/index.js';
import { getNewId } from '#/database/id.js';
import type { Filter, UpdateFilter } from '#/database/mongo/index.js';
import { Singleton } from '#/injector/decorators.js';
import { Lock } from '#/lock/index.js';
import type { MessageBus } from '#/message-bus/index.js';
import { MessageBusProvider } from '#/message-bus/index.js';
import type { EnqueueManyItem, EnqueueManyOptions, EnqueueOneOptions, Job, JobTag, QueueArgument } from '#/queue/index.js';
import { Queue, UniqueTagStrategy, defaultJobPriority, defaultQueueConfig, type QueueConfig } from '#/queue/index.js';
import { Alphabet } from '#/utils/alphabet.js';
import type { BackoffOptions } from '#/utils/backoff.js';
import { backoffGenerator } from '#/utils/backoff.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { propertyNameOf } from '#/utils/object/property-name.js';
import { getRandomString } from '#/utils/random.js';
import { assertDefined, isString, isUndefined } from '#/utils/type-guards.js';
import type { MongoJob, NewMongoJob } from './job.js';
import { MongoJobRepository } from './mongo-job.repository.js';
import { MongoQueueProvider } from './queue.provider.js';

const triesProperty = propertyNameOf<MongoJob>((e) => e.tries);
const lastDequeueTimestampProperty = propertyNameOf<MongoJob>((e) => e.lastDequeueTimestamp);
const enqueueTimestampProperty = propertyNameOf<MongoJob>((e) => e.enqueueTimestamp);
const priorityProperty = propertyNameOf<MongoJob>((e) => e.priority);
const batchProperty = propertyNameOf<MongoJob>((e) => e.batch);

const backoffOptions: BackoffOptions = {
  strategy: 'exponential',
  initialDelay: 100,
  increase: 2,
  maximumDelay: 5000
};

@Singleton<MongoQueue, QueueArgument>({
  provider: {
    useFactory: (argument, context) => {
      const provider = context.resolve(MongoQueueProvider);

      assertDefined(argument, 'queue resolve argument is missing');

      if (isString(argument)) {
        return provider.get(argument, defaultQueueConfig);
      }

      return provider.get(argument.name, { ...defaultQueueConfig, ...argument });
    }
  }
})
export class MongoQueue<T = unknown> extends Queue<T> {
  private readonly repository: MongoJobRepository<T>;
  private readonly lock: Lock;
  private readonly queueKey: string;
  private readonly processTimeout: number;
  private readonly maxTries: number;
  private readonly messageBus: MessageBus<void>;

  constructor(repository: MongoJobRepository<T>, lock: Lock, messageBusProvider: MessageBusProvider, key: string, config?: QueueConfig) {
    super();

    this.repository = repository;
    this.lock = lock;
    this.queueKey = key;
    this.processTimeout = config?.processTimeout ?? defaultQueueConfig.processTimeout;
    this.maxTries = config?.maxTries ?? defaultQueueConfig.maxTries;

    this.messageBus = messageBusProvider.get(`MongoQueue:${repository.collection.collectionName}:${key}`);
  }

  async enqueue(data: T, options: EnqueueOneOptions = {}): Promise<Job<T>> {
    const { tag = null, uniqueTag, priority = defaultJobPriority } = options;

    const newJob: NewMongoJob<T> = {
      queue: this.queueKey,
      jobId: getNewId(),
      tag,
      priority,
      data,
      enqueueTimestamp: currentTimestamp(),
      tries: 0,
      lastDequeueTimestamp: 0,
      batch: null
    };

    const job = (uniqueTag == undefined)
      ? await this.repository.insert(newJob)
      : await this.repository.insertWithUniqueTagStrategy(newJob, uniqueTag);

    return toModelJob(job);
  }

  override async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions & { returnJobs?: false }): Promise<void>;
  override async enqueueMany(items: EnqueueManyItem<T>[], options: EnqueueManyOptions & { returnJobs: true }): Promise<Job<T>[]>;
  override async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions): Promise<void | Job<T>[]>;
  async enqueueMany(items: EnqueueManyItem<T>[], options?: EnqueueManyOptions): Promise<void | Job<T>[]> {
    const now = currentTimestamp();

    const nonUnique: NewMongoJob<T>[] = [];
    const keepOld: NewMongoJob<T>[] = [];
    const takeNew: NewMongoJob<T>[] = [];

    for (const { data, tag = null, priority = defaultJobPriority } of items) {
      const newMongoJob: NewMongoJob<T> = {
        queue: this.queueKey,
        jobId: getNewId(),
        tag,
        priority,
        data,
        enqueueTimestamp: now,
        tries: 0,
        lastDequeueTimestamp: 0,
        batch: null
      };

      switch (options?.uniqueTag) {
        case undefined:
          nonUnique.push(newMongoJob);
          break;

        case UniqueTagStrategy.KeepOld:
          keepOld.push(newMongoJob);
          break;

        case UniqueTagStrategy.TakeNew:
          takeNew.push(newMongoJob);
          break;

        default:
          throw new Error('unsupported UniqueTagStrategy');
      }
    }

    const [nonUniqueJobs] = await Promise.all([
      (nonUnique.length > 0) ? this.repository.insertMany(nonUnique) : [],
      (keepOld.length > 0) ? this.repository.bulkInsertWithUniqueTagStrategy(keepOld, UniqueTagStrategy.KeepOld) : undefined,
      (takeNew.length > 0) ? this.repository.bulkInsertWithUniqueTagStrategy(takeNew, UniqueTagStrategy.TakeNew) : undefined
    ]);

    if (options?.returnJobs == true) {
      const keepOldTags = keepOld.map((job) => job.tag);
      const takeNewTags = takeNew.map((job) => job.tag);

      const uniqueTagJobs = await this.repository.loadManyByFilter({ queue: this.queueKey, tag: { $in: [...keepOldTags, ...takeNewTags] } });

      return [...nonUniqueJobs, ...uniqueTagJobs].map(toModelJob);
    }

    return undefined;
  }

  async has(id: string): Promise<boolean> {
    return this.repository.hasByFilter({ queue: this.queueKey, jobId: id });
  }

  async countByTag(tag: JobTag): Promise<number> {
    return this.repository.countByFilter({ queue: this.queueKey, tag });
  }

  async get(id: string): Promise<Job<T> | undefined> {
    return this.repository.tryLoadByFilter({ queue: this.queueKey, jobId: id });
  }

  async getByTag(tag: JobTag): Promise<Job<T>[]> {
    return this.repository.loadManyByFilter({ queue: this.queueKey, tag });
  }

  async cancel(id: string): Promise<void> {
    await this.repository.deleteByFilter({ queue: this.queueKey, jobId: id });
  }

  async cancelMany(ids: string[]): Promise<void> {
    await this.repository.deleteManyByFilter({ queue: this.queueKey, jobId: { $in: ids } });
  }

  async cancelByTag(tag: JobTag): Promise<void> {
    await this.repository.deleteManyByFilter({ queue: this.queueKey, tag });
  }

  async cancelByTags(tags: JobTag[]): Promise<void> {
    await this.repository.deleteManyByFilter({ queue: this.queueKey, tag: { $in: tags } });
  }

  async dequeue(): Promise<Job<T> | undefined> {
    const { filter, update } = getDequeueFindParameters(this.queueKey, this.maxTries, this.processTimeout);

    const job = await this.repository.baseRepository.tryLoadByFilterAndUpdate(
      filter,
      update,
      {
        returnDocument: 'after',
        sort: {
          priority: 1,
          enqueueTimestamp: 1,
          lastDequeueTimestamp: 1,
          tries: 1
        }
      }
    );

    return isUndefined(job) ? undefined : toModelJob(job);
  }

  async dequeueMany(count: number): Promise<Job<T>[]> {
    const batch = getRandomString(20, Alphabet.LowerUpperCaseNumbers);

    await this.lock.use(10000, true, async () => {
      const { filter } = getDequeueFindParameters(this.queueKey, this.maxTries, this.processTimeout, batch);

      await this.repository.baseRepository.collection.aggregate([
        { $match: filter },
        {
          $sort: {
            [priorityProperty]: 1,
            [enqueueTimestampProperty]: 1,
            [lastDequeueTimestampProperty]: 1,
            [triesProperty]: 1
          }
        },
        { $limit: count },
        {
          $merge: {
            into: this.repository.baseRepository.collection.collectionName,
            whenMatched: [
              {
                $set: {
                  [triesProperty]: { $add: [`$${triesProperty}`, 1] },
                  [lastDequeueTimestampProperty]: currentTimestamp(),
                  [batchProperty]: batch
                }
              }
            ],
            whenNotMatched: 'discard'
          }
        }
      ]).next();
    });

    const jobs = await this.repository.loadManyByFilter({ queue: this.queueKey, batch });
    return jobs.map(toModelJob);
  }

  async acknowledge(job: Job<T>): Promise<void> {
    return this.cancel(job.id);
  }

  async acknowledgeMany(jobs: Job<T>[]): Promise<void> {
    const jobIds = jobs.map((job) => job.id);
    return this.cancelMany(jobIds);
  }

  async *getConsumer(cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>> {
    const continueToken = CancellationToken.from(this.messageBus.allMessages$);

    for await (const backoff of backoffGenerator(backoffOptions, cancellationSignal)) {
      const job = await this.dequeue();

      if (job != undefined) {
        yield job;
      }
      else {
        backoff(continueToken);
      }
    }

    continueToken.complete();
  }

  async *getBatchConsumer(size: number, cancellationSignal: CancellationSignal): AsyncIterableIterator<Job<T>[]> {
    const continueToken = CancellationToken.from(this.messageBus.allMessages$);

    for await (const backoff of backoffGenerator(backoffOptions, cancellationSignal)) {
      const jobs = await this.dequeueMany(size);

      if (jobs.length > 0) {
        yield jobs;
      }
      else {
        backoff(continueToken);
      }
    }

    continueToken.complete();
  }
}

function toModelJob<T>(mongoJob: MongoJob<T>): Job<T> {
  const job: Job<T> = {
    id: mongoJob.jobId,
    priority: mongoJob.priority,
    tag: mongoJob.tag,
    data: mongoJob.data
  };

  return job;
}

function getDequeueFindParameters(queueKey: string, maxTries: number, processTimeout: number, batch: null | string = null) {
  const now = currentTimestamp();
  const maximumLastDequeueTimestamp = now - processTimeout;

  const filter: Filter<MongoJob<any>> = {
    queue: queueKey,
    tries: { $lt: maxTries },
    lastDequeueTimestamp: { $lte: maximumLastDequeueTimestamp }
  };

  const update: UpdateFilter<MongoJob<any>> = {
    $inc: { tries: 1 },
    $set: {
      lastDequeueTimestamp: now,
      batch
    }
  };

  return { filter, update };
}
