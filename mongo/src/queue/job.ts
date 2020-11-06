import type { Entity, NewEntity } from '@tstdl/database';

export type MongoJob<T> = Entity & {
  data: T,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type NewMongoJob<T> = NewEntity<MongoJob<T>>;
