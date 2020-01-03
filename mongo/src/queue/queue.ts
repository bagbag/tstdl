import { Job, Queue } from '@tstdl/base/queue';
import { createArray, currentTimestamp, timeout, toArray } from '@tstdl/base/utils';
import { CancellationToken } from '@tstdl/base/utils/cancellation-token';
import { FilterQuery, UpdateQuery } from 'mongodb';
import { MongoBaseRepository } from '../base-repository';
import { Collection } from '../types';
import { MongoJob, MongoJobWithoutId } from './job';

export class MongoQueue<T> implements Queue<T> {
  private readonly baseRepository: MongoBaseRepository<MongoJob<T>>;
  private readonly consumerCheckInterval: number;
  private readonly processTimeout: number;
  private readonly maxTries: number;

  constructor(collection: Collection<MongoJob<T>>, consumerCheckInterval: number, processTimeout: number, maxTries: number) {
    this.baseRepository = new MongoBaseRepository(collection);
    this.consumerCheckInterval = consumerCheckInterval;
    this.processTimeout = processTimeout;
    this.maxTries = maxTries;
  }

  async enqueue(data: T): Promise<Job<T>> {
    const newJob: MongoJobWithoutId<T> = {
      data,
      enqueueTimestamp: currentTimestamp(),
      tries: 0,
      lastDequeueTimestamp: 0
    };

    const job = await this.baseRepository.insert(newJob);
    return toModelJob(job);
  }

  async enqueueMany(data: T[]): Promise<Job<T>[]> {
    const now = currentTimestamp();

    const newJobs: MongoJobWithoutId<T>[] = data.map((data) => {
      const newJob: MongoJobWithoutId<T> = {
        data,
        enqueueTimestamp: now,
        tries: 0,
        lastDequeueTimestamp: 0
      };

      return newJob;
    });

    const jobs = await this.baseRepository.insertMany(newJobs);
    return jobs.map(toModelJob);
  }

  async dequeue(): Promise<Job<T> | undefined> {
    const { filter, update } = getDequeueFindParameters(this.maxTries, this.processTimeout);
    const job = await this.baseRepository.tryLoadByFilterAndUpdate(filter, update, { returnOriginal: false, sort: [['enqueueTimestamp', 1], ['lastDequeueTimestamp', 1], ['tries', 1]] });

    return job == undefined ? undefined : toModelJob(job);
  }

  async dequeueMany(count: number): Promise<Job<T>[]> {
    const promises = createArray(count, (i) => i).map(() => this.dequeue());
    const jobs = await Promise.all(promises);

    return jobs.filter((job) => job != undefined) as Job<T>[];
  }

  async acknowledge(jobOrJobs: Job<T> | Job<T>[]): Promise<void> {
    const jobIds = toArray(jobOrJobs).map((job) => job.id);
    await this.baseRepository.deleteManyById(jobIds);
  }

  async *getConsumer(cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>> {
    while (!cancellationToken.isSet) {
      const job = await this.dequeue();

      if (job != undefined) {
        yield job;
      }
      else {
        await timeout(this.consumerCheckInterval);
      }
    }
  }

  async *getBatchConsumer(size: number, cancellationToken: CancellationToken): AsyncIterableIterator<Job<T>[]> {
    while (!cancellationToken.isSet) {
      const jobs = await this.dequeueMany(size);

      if (jobs.length > 0) {
        yield jobs;
      }
      else {
        await timeout(this.consumerCheckInterval);
      }
    }
  }
}

function toModelJob<T>(mongoJob: MongoJob<T>): Job<T> {
  const job: Job<T> = {
    id: mongoJob.id,
    data: mongoJob.data
  };

  return job;
}

function getDequeueFindParameters(maxTries: number, processTimeout: number) {
  const maximumLastDequeueTimestamp = currentTimestamp() - processTimeout;

  const filter: FilterQuery<MongoJob<any>> = {
    tries: { $lt: maxTries },
    lastDequeueTimestamp: { $lte: maximumLastDequeueTimestamp }
  };

  const update: UpdateQuery<MongoJob<any>> = {
    $inc: { tries: 1 },
    $set: { lastDequeueTimestamp: currentTimestamp() }
  };

  return { filter, update };
}
