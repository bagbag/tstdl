import { Omit } from '@common-ts/base/types';
import { Collection, FilterQuery, IndexSpecification, UpdateQuery } from 'mongodb';
import { MongoDocument } from './mongo-document';

export type TypedIndexSpecification<T> = Omit<IndexSpecification, 'key'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' }
};

export type Collection<T> = Collection<MongoDocument<T>>;
export type FilterQuery<T> = FilterQuery<MongoDocument<T>>;
export type UpdateQuery<T> = UpdateQuery<MongoDocument<T>>;
