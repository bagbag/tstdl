/* eslint-disable @typescript-eslint/semi */
import type { Logger } from '#/logger';
import type { Entity, EntityRepository } from '#/database';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository';
import type { Collection } from './types';

export class SimpleMongoEntityRepository<T extends Entity> extends MongoEntityRepository<T> implements EntityRepository<T> {
  constructor(collection: Collection<T>, logger: Logger) {
    super(collection, noopTransformer, { logger });
  }
}
