import * as Mongo from 'mongodb';
import { MongoDocument } from './model';

export type TypedIndexSpecification<T> = Omit<Mongo.IndexSpecification, 'key' | 'partialFilterExpression'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' },
  partialFilterExpression?: FilterQuery<T>
};

export type Collection<T> = Mongo.Collection<MongoDocument<T>>;
export type FilterQuery<T> = Mongo.FilterQuery<MongoDocument<T>>;
export type UpdateQuery<T> = Mongo.UpdateQuery<MongoDocument<T>>;
