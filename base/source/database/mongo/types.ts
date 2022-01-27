import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';
import type { Entity } from '#/database';
import type { MongoRepositoryConfig } from '#/mongo.instance-provider';
import type * as Mongo from 'mongodb';
import { Collection as MongoCollection } from 'mongodb';
import type { MongoDocument } from './model';

export type CollectionArgument<T extends Entity = Entity, TDb extends Entity = T> = MongoRepositoryConfig<T, TDb>;

export class Collection<T extends Entity = Entity, TDb extends Entity = T> extends MongoCollection<MongoDocument<T>> implements Injectable<CollectionArgument<T, TDb>> {
  readonly [resolveArgumentType]?: CollectionArgument<T, TDb>;
}

export type Filter<T extends Entity = Entity> = Mongo.Filter<MongoDocument<T>>;
export type UpdateFilter<T extends Entity = Entity> = Mongo.UpdateFilter<MongoDocument<T>>;

export type BulkOperation<T extends Entity = Entity> = InsertOneOperation<T> | ReplaceOneOperation<T> | UpdateOneOperation<T> | UpdateManyOperation<T> | DeleteOneOperation<T> | DeleteManyOperation<T>;
export type InsertOneOperation<T extends Entity = Entity> = { insertOne: Mongo.InsertOneModel<MongoDocument<T>> };
export type ReplaceOneOperation<T extends Entity = Entity> = { replaceOne: Mongo.ReplaceOneModel<MongoDocument<T>> };
export type UpdateOneOperation<T extends Entity = Entity> = { updateOne: Mongo.UpdateOneModel<MongoDocument<T>> };
export type UpdateManyOperation<T extends Entity = Entity> = { updateMany: Mongo.UpdateManyModel<MongoDocument<T>> };
export type DeleteOneOperation<T extends Entity = Entity> = { deleteOne: Mongo.DeleteOneModel<MongoDocument<T>> };
export type DeleteManyOperation<T extends Entity = Entity> = { deleteMany: Mongo.DeleteManyModel<MongoDocument<T>> };

export type SortObject<T extends Entity = Entity> = { [P in keyof MongoDocument<T>]?: 1 | -1 };
export type SortArrayItem<T extends Entity = Entity> = [keyof MongoDocument<T> & string, 1 | -1];
export type SortArray<T extends Entity = Entity> = SortArrayItem<T>[];
export type Sort<T extends Entity = Entity> = SortArray<T> | SortObject<T>;

export type TypedIndexDescription<T extends Entity = Entity> = Omit<Mongo.IndexDescription, 'key' | 'partialFilterExpression'> & {
  key: { [P in keyof T]?: 1 | -1 | 'text' | 'hashed' },
  partialFilterExpression?: Filter<T>
};
