import { injectable } from '#/container';
import { getNewId } from '#/database';
import { Logger } from '#/logger';
import { UniqueTagStrategy } from '#/queue';
import { MongoEntityRepository, noopTransformer } from '../mongo-entity-repository';
import type { TypedIndexDescription } from '../types';
import { Collection } from '../types';
import type { MongoJob, NewMongoJob } from './job';

const indexes: TypedIndexDescription<MongoJob<any>>[] = [
  { key: { jobId: 1 }, unique: true },
  { key: { priority: 1, enqueueTimestamp: 1, lastDequeueTimestamp: 1, tries: 1 } },
  { key: { tag: 1 } },
  { key: { batch: 1 } }
];

@injectable()
export class MongoJobRepository<T> extends MongoEntityRepository<MongoJob<T>> {
  constructor(collection: Collection<MongoJob<T>>, logger: Logger) {
    super(collection, noopTransformer, { indexes, logger });
  }

  async insertWithUniqueTagStrategy(newJob: NewMongoJob<T>, uniqueTagStrategy: UniqueTagStrategy): Promise<MongoJob<T>> {
    const { tag, ...rest } = newJob;

    if (uniqueTagStrategy == UniqueTagStrategy.KeepOld) {
      return this.baseRepository.loadByFilterAndUpdate({ tag }, { $setOnInsert: { _id: getNewId(), ...rest } }, { upsert: true, returnDocument: 'after' });
    }

    return this.baseRepository.loadByFilterAndUpdate({ tag }, { $set: rest, $setOnInsert: { _id: getNewId() } }, { upsert: true, returnDocument: 'after' });
  }

  async bulkInsertWithUniqueTagStrategy(newJobs: NewMongoJob<T>[], uniqueTagStrategy: UniqueTagStrategy): Promise<void> {
    const bulk = this.baseRepository.bulk();

    for (const newJob of newJobs) {
      const { tag, ...rest } = newJob;

      const updateQuery = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
        ? { $setOnInsert: { _id: getNewId(), ...rest } }
        : { $set: rest, $setOnInsert: { _id: getNewId() } };

      bulk.update({ tag }, updateQuery, { upsert: true });
    }

    await bulk.execute(false);
  }
}
