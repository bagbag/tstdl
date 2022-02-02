/* eslint-disable @typescript-eslint/semi */
import type { Entity } from '#/database';
import type { Logger } from '#/logger';
import type { Collection } from './classes';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository';

export class SimpleMongoEntityRepository<T extends Entity> extends MongoEntityRepository<T> {
  constructor(collection: Collection<T>, logger: Logger) {
    super(collection, noopTransformer, { logger });
  }
}
