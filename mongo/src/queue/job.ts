import type { Entity, EntityWithoutId } from '@tstdl/database';

export type MongoJob<T> = Entity & {
  data: T,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type MongoJobWithoutId<T> = EntityWithoutId<MongoJob<T>>;
