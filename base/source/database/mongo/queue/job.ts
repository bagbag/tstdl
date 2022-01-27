import type { Entity, NewEntity } from '#/database';
import type { Job } from '#/queue';
import type { TypedOmit } from '#/types';

export type MongoJob<T = unknown> = Entity & TypedOmit<Job<T>, 'id'> & {
  queue: string,
  jobId: string,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type NewMongoJob<T> = NewEntity<MongoJob<T>>;
