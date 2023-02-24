import type { Entity } from '#/database/index.js';

export type MongoLockEntity = Entity & {
  resource: string,
  key: string,
  expiration: Date
};
