import type { Entity } from '#/database';
import type * as Mongo from 'mongodb';
import type { MongoDocument } from './model';

export type Collection<T extends Entity = Entity> = Mongo.Collection<MongoDocument<T>>;

export type Filter<T extends Entity = Entity> = Mongo.Filter<MongoDocument<T>>;
export type UpdateFilter<T extends Entity = Entity> = Mongo.UpdateFilter<MongoDocument<T>>;

export type BulkWriteOperation<T extends Entity = Entity> = InsertOneBulkWriteOperation<T> | ReplaceOneBulkWriteOperation<T> | UpdateOneBulkWriteOperation<T> | UpdateManyBulkWriteOperation<T> | DeleteOneBulkWriteOperation<T> | DeleteManyBulkWriteOperation<T>;
export type InsertOneBulkWriteOperation<T extends Entity = Entity> = { insertOne: Mongo.InsertOneModel<MongoDocument<T>> };
export type ReplaceOneBulkWriteOperation<T extends Entity = Entity> = { replaceOne: Mongo.ReplaceOneModel<MongoDocument<T>> };
export type UpdateOneBulkWriteOperation<T extends Entity = Entity> = { updateOne: Mongo.UpdateOneModel<MongoDocument<T>> };
export type UpdateManyBulkWriteOperation<T extends Entity = Entity> = { updateMany: Mongo.UpdateManyModel<MongoDocument<T>> };
export type DeleteOneBulkWriteOperation<T extends Entity = Entity> = { deleteOne: Mongo.DeleteOneModel<MongoDocument<T>> };
export type DeleteManyBulkWriteOperation<T extends Entity = Entity> = { deleteMany: Mongo.DeleteManyModel<MongoDocument<T>> };

export type SortObject<T extends Entity = Entity> = { [P in keyof MongoDocument<T>]?: 1 | -1 };
export type SortArrayItem<T extends Entity = Entity> = [keyof MongoDocument<T> & string, 1 | -1];
export type SortArray<T extends Entity = Entity> = SortArrayItem<T>[];
export type Sort<T extends Entity = Entity> = SortArray<T> | SortObject<T>;

export type TypedIndexDescription<T extends Entity = Entity> = Omit<Mongo.IndexDescription, 'key' | 'partialFilterExpression'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' },
  partialFilterExpression?: Filter<T>
};
