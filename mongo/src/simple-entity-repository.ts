/* eslint-disable @typescript-eslint/semi */
import type { Logger } from '@tstdl/base/logger';
import type { Entity, EntityRepository } from '@tstdl/database';
import { MongoEntityRepository, noopTransformer } from './entity-repository';
import type { Collection } from './types';

export class SimpleMongoEntityRepository<T extends Entity> extends MongoEntityRepository<T> implements EntityRepository<T> {
  constructor(collection: Collection<T>, logger: Logger) {
    super(collection, noopTransformer, { logger });
  }
}
