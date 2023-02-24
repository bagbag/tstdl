import type { Entity, NewEntity } from '#/database/index.js';
import type { Job } from '#/queue/index.js';
import type { TypedOmit } from '#/types.js';

export type MongoJob<T = unknown> = Entity & TypedOmit<Job<T>, 'id'> & {
  queue: string,
  jobId: string,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type NewMongoJob<T> = NewEntity<MongoJob<T>>;
