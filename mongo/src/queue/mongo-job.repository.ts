import type { Logger } from '@tstdl/base/logger';
import type { EntityRepository } from '@tstdl/database';
import { MongoEntityRepository, noopTransformer } from '../entity-repository';
import type { Collection, TypedIndexSpecification } from '../types';
import type { MongoJob } from './job';


const indexes: TypedIndexSpecification<MongoJob<any>>[] = [
  { name: 'enqueueTimestamp_lastDequeueTimestamp_tries', key: { enqueueTimestamp: 1, lastDequeueTimestamp: 1, tries: 1 } },
  { name: 'batch', key: { batch: 1 } }
];

export class MongoJobRepository<T> extends MongoEntityRepository<MongoJob<T>> implements EntityRepository<MongoJob<T>> {
  constructor(collection: Collection<MongoJob<T>>, logger: Logger) {
    super(collection, noopTransformer, { indexes, logger, entityName: 'mongo-job' });
  }
}
