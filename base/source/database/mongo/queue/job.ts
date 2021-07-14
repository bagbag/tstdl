import type { Job } from '#/queue';
import type { TypedOmit } from '#/types';
import type { Entity, NewEntity } from '#/database';

export type MongoJob<T> = Entity & TypedOmit<Job<T>, 'id'> & {
  jobId: string,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type NewMongoJob<T> = NewEntity<MongoJob<T>>;
