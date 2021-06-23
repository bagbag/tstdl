import type { Job } from '@tstdl/base/queue';
import type { TypedOmit } from '@tstdl/base/types';
import type { Entity, NewEntity } from '@tstdl/database';

export type MongoJob<T> = Entity & TypedOmit<Job<T>, 'id'> & {
  jobId: string,
  enqueueTimestamp: number,
  tries: number,
  lastDequeueTimestamp: number,
  batch: null | string
};

export type NewMongoJob<T> = NewEntity<MongoJob<T>>;
