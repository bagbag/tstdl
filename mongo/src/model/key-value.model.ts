import type { Entity } from '@tstdl/database';

export type MongoKeyValue<T = unknown> = Entity & {
  scope: string,
  key: string,
  value: T
};
