/* eslint-disable @typescript-eslint/semi */
import type { Entity } from '#/database/index.js';
import type { Logger } from '#/logger/index.js';
import type { Collection } from './classes.js';
import { MongoEntityRepository, noopTransformer } from './mongo-entity-repository.js';

export class SimpleMongoEntityRepository<T extends Entity> extends MongoEntityRepository<T> {
  constructor(collection: Collection<T>, logger: Logger) {
    super(collection, noopTransformer, { logger });
  }
}
