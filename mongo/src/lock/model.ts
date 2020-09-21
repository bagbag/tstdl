import type { Entity } from '@tstdl/database';

export type MongoLockEntity = Entity & {
  ressource: string,
  key: string,
  expire: Date
};
