import { getNewId } from '#/database/id';
import type { EnqueueManyItem, EnqueueOptions, Job, JobTag, Queue } from '#/queue';
import { UniqueTagStrategy } from '#/queue';
import type { BackoffOptions, CancellationToken } from '#/utils';
import { Alphabet, backoffGenerator, BackoffStrategy, currentTimestamp, getRandomString } from '#/utils';
import type { Filter, UpdateFilter } from '../types';
import type { MongoJob, NewMongoJob } from './job';
import type { MongoJobRepository } from './mongo-job.repository';

const backoffOptions: BackoffOptions = {
  strategy: BackoffStrategy.Exponential,
  initialDelay: 100,
  increase: 2,
  maximumDelay: 5000
};

export class MongoQueue<T> implements Queue<T> {
  private readonly repository: MongoJobRepository<T>;
  private readonly processTimeout: number;
  private readonly maxTries: number;

  constructor(repository: MongoJobRepository<T>, processTimeout: number, maxTries: number) {
    this.repository = repository;
    this.processTimeout = processTimeout;
    this.maxTries = maxTries;
  }

  async enqueue(data: T, options: EnqueueOptions = {}): Promise<Job<T>> {
    const { tag = null, uniqueTag, priority = 0 } = options;

    const newJob: NewMongoJob<T> = {
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

  async enqueueMany(items: EnqueueManyItem<T>[], returnJobs?: false): Promise<void>;
  async enqueueMany(items: EnqueueManyItem<T>[], returnJobs: true): Promise<Job<T>[]>;
  async enqueueMany(items: EnqueueManyItem<T>[], returnJobs?: boolean): Promise<void | Job<T>[]> { // eslint-disable-line max-lines-per-function
    const now = currentTimestamp();

    const nonUnique: NewMongoJob<T>[] = [];
    const keepOld: NewMongoJob<T>[] = [];
    const takeNew: NewMongoJob<T>[] = [];

    for (const { data, tag = null, uniqueTag, priority = 0 } of items) {
      const newMongoJob: NewMongoJob<T> = {
        jobId: getNewId(),
        tag,
        priority,
        data,
        enqueueTimestamp: now,
        tries: 0,
        lastDequeueTimestamp: 0,
        batch: null
      };

      switch (uniqueTag) {
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

    if (returnJobs == true) {
      const keepOldTags = keepOld.map((job) => job.tag);
      const takeNewTags = takeNew.map((job) => job.tag);

      const uniqueTagJobs = await this.repository.loadManyByFilter({ tag: { $in: [...keepOldTags, ...takeNewTags] } });

      return [...nonUniqueJobs, ...uniqueTagJobs].map(toModelJob);
    }

    return undefined;
  }

  async has(id: string): Promise<boolean> {
    return this.repository.hasByFilter({ jobId: id });
  }

  async countByTag(tag: JobTag): Promise<number> {
    return this.repository.countByFilter({ tag });
  }

  async get(id: string): Promise<Job<T> | undefined> {
    return this.repository.tryLoadByFilter({ jobId: id });
  }

  async getByTag(tag: JobTag): Promise<Job<T>[]> {
    return this.repository.loadManyByFilter({ tag });
  }

  async cancel(id: string): Promise<void> {
    await this.repository.deleteByFilter({ jobId: id });
  }

  async cancelMany(ids: string[]): Promise<void> {
    await this.repository.deleteManyByFilter({ jobId: { $in: ids } });
  }

  async cancelByTag(tag: JobTag): Promise<void> {
    await this.repository.deleteManyByFilter({ tag });
  }

  async dequeue(): Promise<Job<T> | undefined> {
    const { filter, update } = getDequeueFindParameters(this.maxTries, this.processTimeout);

    const job = await this.repository.baseRepository.tryLoadByFilterAndUpdate(
      filter,
      update,
      {
        returnDocument: 'after',
        sort: [['priority', 1], ['enqueueTimestamp', 1], ['lastDequeueTimestamp', 1], ['tries', 1]]
      }
    );

    return (job == undefined) ? undefined : toModelJob(job);
  }

  async dequeueMany(count: number): Promise<Job<T>[]> {
    const batch = getRandomString(20, Alphabet.LowerUpperCaseNumbers);
    const { filter, update } = getDequeueFindParameters(this.maxTries, this.processTimeout, batch);

    const bulk = this.repository.baseRepository.bulk();

    for (let i = 0; i < count; i++) {
      bulk.update(filter, update);
    }

    await bulk.execute();

    const jobs = await this.repository.loadManyByFilter({ batch });

    return jobs.map(toModelJob);
  }

  async acknowledge(job: Job<T>): Promise<void> {
    return this.cancel(job.id);
  }

  async acknowledgeMany(jobs: Job<T>[]): Promise<void> {
    const jobIds = jobs.map((job) => job.id);
    return this.cancelMany(jobIds);
  }

  async *getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>> {
    for await (const backoff of backoffGenerator(backoffOptions, cancellationToken)) {
      const job = await this.dequeue();

      if (job != undefined) {
        yield job;
      }
      else {
        backoff();
      }
    }
  }

  async *getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]> {
    for await (const backoff of backoffGenerator(backoffOptions, cancellationToken)) {
      const jobs = await this.dequeueMany(size);

      if (jobs.length > 0) {
        yield jobs;
      }
      else {
        backoff();
      }
    }
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

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function getDequeueFindParameters(maxTries: number, processTimeout: number, batch: null | string = null) {
  const now = currentTimestamp();
  const maximumLastDequeueTimestamp = now - processTimeout;

  const filter: Filter<MongoJob<any>> = {
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
