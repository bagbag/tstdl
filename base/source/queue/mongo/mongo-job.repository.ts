import type { Injectable } from '#/container';
import { forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import { getNewId } from '#/database';
import type { CollectionArgument, TypedIndexDescription } from '#/database/mongo';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo';
import { Logger } from '#/logger';
import { UniqueTagStrategy } from '#/queue';
import type { MongoJob, NewMongoJob } from './job';

const indexes: TypedIndexDescription<MongoJob<any>>[] = [
  { key: { queue: 1, jobId: 1 }, unique: true },
  { key: { queue: 1, priority: 1, enqueueTimestamp: 1, lastDequeueTimestamp: 1, tries: 1 } },
  { key: { queue: 1, tag: 1 } },
  { key: { queue: 1, batch: 1 } },
  { key: { queue: 1, tries: 1 } }
];

@singleton()
export class MongoJobRepository<T> extends MongoEntityRepository<MongoJob<T>> implements Injectable<CollectionArgument<MongoJob<T>>> {
  readonly [resolveArgumentType]: CollectionArgument<MongoJob<T>>;

  constructor(@forwardArg() collection: Collection<MongoJob<T>>, @resolveArg(MongoJobRepository.name) logger: Logger) {
    super(collection, noopTransformer, { indexes, logger });
  }

  async insertWithUniqueTagStrategy(newJob: NewMongoJob<T>, uniqueTagStrategy: UniqueTagStrategy): Promise<MongoJob<T>> {
    const { queue, tag, ...rest } = newJob;

    const updateQuery = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
      ? { $setOnInsert: { _id: getNewId(), ...rest } }
      : { $set: rest, $setOnInsert: { _id: getNewId() } };

    return this.baseRepository.loadByFilterAndUpdate({ queue, tag }, updateQuery, { upsert: true, returnDocument: 'after' });
  }

  async bulkInsertWithUniqueTagStrategy(newJobs: NewMongoJob<T>[], uniqueTagStrategy: UniqueTagStrategy): Promise<void> {
    const bulk = this.baseRepository.bulk();

    for (const newJob of newJobs) {
      const { queue, tag, ...rest } = newJob;

      const updateQuery = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
        ? { $setOnInsert: { _id: getNewId(), ...rest } }
        : { $set: rest, $setOnInsert: { _id: getNewId() } };

      bulk.update({ queue, tag }, updateQuery, { upsert: true });
    }

    await bulk.execute(false);
  }
}
