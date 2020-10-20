import type { Entity } from '@tstdl/database';
import type * as Mongo from 'mongodb';
import type { MongoDocument } from './model';

export type TypedIndexSpecification<T extends Entity> = Omit<Mongo.IndexSpecification, 'key' | 'partialFilterExpression'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' },
  partialFilterExpression?: FilterQuery<T>
};

export type Collection<T extends Entity> = Mongo.Collection<MongoDocument<T>>;
export type FilterQuery<T extends Entity> = Mongo.FilterQuery<MongoDocument<T>>;
export type UpdateQuery<T extends Entity> = Mongo.UpdateQuery<MongoDocument<T>>;
export type RootQuerySelector<T extends Entity> = Mongo.RootQuerySelector<MongoDocument<T>>;
export type SortOptionObject<T extends Entity> = Mongo.SortOptionObject<MongoDocument<T>>;
export type BulkWriteOperation<T extends Entity> = Mongo.BulkWriteOperation<MongoDocument<T>>;
