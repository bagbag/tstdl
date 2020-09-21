import type { Entity } from '@tstdl/database';

export type LockEntity = Entity & {
  ressource: string,
  key: string,
  expire: Date
};
