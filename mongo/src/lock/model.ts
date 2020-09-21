import type { Entity } from '@tstdl/database';

export type MongoLockEntity = Entity & {
  resource: string,
  key: string,
  expiration: Date
};
