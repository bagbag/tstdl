import type { Logger } from '@tstdl/base/logger';
import { UniqueTagStrategy } from '@tstdl/base/queue';
import type { EntityRepository } from '@tstdl/database';
import { getNewId } from '@tstdl/database';
import { MongoEntityRepository, noopTransformer } from '../mongo-entity-repository';
import type { Collection, TypedIndexSpecification } from '../types';
import type { MongoJob, NewMongoJob } from './job';

const indexes: TypedIndexSpecification<MongoJob<any>>[] = [
  { name: 'priority_enqueueTimestamp_lastDequeueTimestamp_tries', key: { priority: 1, enqueueTimestamp: 1, lastDequeueTimestamp: 1, tries: 1 } },
  { name: 'tag', key: { tag: 1 } },
  { name: 'batch', key: { batch: 1 } }
];

export class MongoJobRepository<T> extends MongoEntityRepository<MongoJob<T>> implements EntityRepository<MongoJob<T>> {
  constructor(collection: Collection<MongoJob<T>>, logger: Logger) {
    super(collection, noopTransformer, { indexes, logger, entityName: 'mongo-job' });
  }

  async insertWithUniqueTagStrategy(newJob: NewMongoJob<T>, uniqueTagStrategy: UniqueTagStrategy): Promise<MongoJob<T>> {
    const { tag, ...rest } = newJob;

    if (uniqueTagStrategy == UniqueTagStrategy.KeepOld) {
      return this.baseRepository.loadByFilterAndUpdate({ tag }, { $setOnInsert: { ...rest, _id: getNewId() } }, { returnDocument: 'after' });
    }

    return this.baseRepository.loadByFilterAndUpdate({ tag }, { $set: rest, $setOnInsert: { _id: getNewId() } }, { returnDocument: 'after' });
  }

  async bulkInsertWithUniqueTagStrategy(newJobs: NewMongoJob<T>[], uniqueTagStrategy: UniqueTagStrategy): Promise<void> {
    const bulk = this.baseRepository.bulk();

    for (const newJob of newJobs) {
      const { tag, ...rest } = newJob;

      const updateQuery = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
        ? { $setOnInsert: { ...rest, _id: getNewId() } }
        : { $set: rest, $setOnInsert: { _id: getNewId() } };

      bulk.update({ tag }, updateQuery);
    }

    await bulk.execute(false);
  }
}
