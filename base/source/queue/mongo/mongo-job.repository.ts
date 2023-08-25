import { getNewId } from '#/database/index.js';
import type { CollectionArgument, Filter, TypedIndexDescription } from '#/database/mongo/index.js';
import { Collection, MongoEntityRepository, noopTransformer } from '#/database/mongo/index.js';
import type { Resolvable } from '#/injector/index.js';
import { ForwardArg, ResolveArg, Singleton, resolveArgumentType } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { UniqueTagStrategy } from '#/queue/index.js';
import type { MongoJob, NewMongoJob } from './job.js';

const indexes: TypedIndexDescription<MongoJob<any>>[] = [
  { key: { queue: 1, jobId: 1 }, unique: true },
  { key: { queue: 1, priority: 1, enqueueTimestamp: 1, lastDequeueTimestamp: 1, tries: 1 } },
  { key: { queue: 1, tag: 1 } },
  { key: { queue: 1, batch: 1 } },
  { key: { queue: 1, tries: 1 } }
];

@Singleton()
export class MongoJobRepository<T> extends MongoEntityRepository<MongoJob<T>> implements Resolvable<CollectionArgument<MongoJob<T>>> {
  declare readonly [resolveArgumentType]: CollectionArgument<MongoJob<T>>;
  constructor(@ForwardArg() collection: Collection<MongoJob<T>>, @ResolveArg(MongoJobRepository.name) logger: Logger) {
    super(collection, noopTransformer, { indexes: indexes as TypedIndexDescription<MongoJob<T>>[], logger });
  }

  async insertWithUniqueTagStrategy(newJob: NewMongoJob<T>, uniqueTagStrategy: UniqueTagStrategy): Promise<MongoJob<T>> {
    const { queue, tag, ...rest } = newJob;

    const updateQuery: Filter<MongoJob<T>> = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
      ? { $setOnInsert: { _id: getNewId(), ...rest } }
      : { $set: rest, $setOnInsert: { _id: getNewId() } };

    return this.baseRepository.loadByFilterAndUpdate({ queue, tag }, updateQuery, { upsert: true, returnDocument: 'after' });
  }

  async bulkInsertWithUniqueTagStrategy(newJobs: NewMongoJob<T>[], uniqueTagStrategy: UniqueTagStrategy): Promise<void> {
    const bulk = this.baseRepository.bulk();

    for (const newJob of newJobs) {
      const { queue, tag, ...rest } = newJob;

      const updateQuery: Filter<MongoJob> = (uniqueTagStrategy == UniqueTagStrategy.KeepOld)
        ? { $setOnInsert: { _id: getNewId(), ...rest } }
        : { $set: rest, $setOnInsert: { _id: getNewId() } };

      bulk.update({ queue, tag }, updateQuery, { upsert: true });
    }

    await bulk.execute(false);
  }
}
