import type { Entity } from '#/database';

export type MongoLockEntity = Entity & {
  resource: string,
  key: string,
  expiration: Date
};
