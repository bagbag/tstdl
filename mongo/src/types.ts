import { Omit } from '@tstdl/base/types';
import * as Mongo from 'mongodb';
import { MongoDocument } from './mongo-document';

export type TypedIndexSpecification<T> = Omit<Mongo.IndexSpecification, 'key'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' }
};

export type Collection<T> = Mongo.Collection<MongoDocument<T>>;
export type FilterQuery<T> = Mongo.FilterQuery<MongoDocument<T>>;
export type UpdateQuery<T> = Mongo.UpdateQuery<MongoDocument<T>>;
