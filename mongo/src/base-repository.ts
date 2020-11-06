/* eslint-disable @typescript-eslint/naming-convention */

import { Enumerable } from '@tstdl/base/enumerable';
import { NotFoundError } from '@tstdl/base/error';
import { assertDefined, currentTimestamp } from '@tstdl/base/utils';
import type { Entity, MaybeNewEntity } from '@tstdl/database';
import type { BulkWriteDeleteManyOperation, BulkWriteDeleteOneOperation, BulkWriteInsertOneOperation, BulkWriteReplaceOneOperation, BulkWriteUpdateManyOperation, BulkWriteUpdateOneOperation, FindAndModifyWriteOpResultObject } from 'mongodb';
import { MongoDocument, mongoDocumentFromMaybeNewEntity, toEntity, toMongoDocument, toMongoProjection, toNewEntity, toProjectedEntity } from './model';
import { MongoBulk } from './mongo-bulk';
import type { Collection, FilterQuery, TypedIndexSpecification, UpdateQuery } from './types';

export enum ProjectionMode {
  Include = 0,
  Exclude = 1
}

export type Projection<T, M extends ProjectionMode> = { [P in keyof T]?: M extends ProjectionMode.Include ? true : false };

export type ProjectedEntity<T, M extends ProjectionMode, P extends Projection<T, M>> =
  M extends ProjectionMode.Include
  ? { [K in keyof T]: P[K] extends true ? T[K] : undefined }
  : { [K in keyof T]: P[K] extends false ? undefined : T[K] };

export type SortObject<T extends Entity> = { [P in keyof MongoDocument<T>]?: 1 | -1 };

export type SortArray<T extends Entity> = [keyof MongoDocument<T> & string, 1 | -1][];

export type Sort<T extends Entity> = SortArray<T> | SortObject<T>;

export type ReplaceOptions = {
  upsert?: boolean
};

export type UpdateOptions = {
  upsert?: boolean
};

export type UpdateResult = {
  matchedCount: number,
  modifiedCount: number
};

export type LoadOptions<T extends Entity> = {
  limit?: number,
  skip?: number,
  sort?: Sort<T>
};

export type LoadAndDeleteOptions<T extends Entity> = LoadOptions<T>;

export type LoadManyOptions<T extends Entity> = LoadOptions<T>;

export type LoadAndUpdateOptions<T extends Entity> = LoadOptions<T> & {
  upsert?: boolean,
  returnOriginal?: boolean,
  sort?: Sort<T>
};

export type CountOptions = {
  estimate?: boolean,
  limit?: number,
  skip?: number
};

export type MongoBaseRepositoryOptions = {
  entityName?: string
};

export type InsertIfNotExistsByFilterItem<T extends Entity> = {
  filter: FilterQuery<T>,
  entity: MaybeNewEntity<T>
};

export class MongoBaseRepository<T extends Entity> {
  readonly collection: Collection<T>;
  readonly entityName: string;

  constructor(collection: Collection<T>, options?: MongoBaseRepositoryOptions) {
    this.collection = collection;
    this.entityName = options?.entityName ?? 'entity';
  }

  async createIndexes(indexes: TypedIndexSpecification<T>[]): Promise<void> {
    await this.collection.createIndexes(indexes);
  }

  bulk(): MongoBulk<T> {
    return new MongoBulk(this.collection);
  }

  async insert<U extends T>(entity: MaybeNewEntity<U>): Promise<U> {
    const document = mongoDocumentFromMaybeNewEntity(entity);
    await this.collection.insertOne(document as any);

    return toEntity(document);
  }

  async insertMany<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents = entities.map(mongoDocumentFromMaybeNewEntity);
    const operations = documents.map(insertOneOperation);
    await this.collection.bulkWrite(operations as any);

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async insertIfNotExists<U extends T>(entity: MaybeNewEntity<U>): Promise<U | undefined> {
    const filter: FilterQuery<U> = toNewEntity(entity) as FilterQuery<U>;
    return this.insertIfNotExistsByFilter(filter, entity);
  }

  async insertManyIfNotExists<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]> {
    const items: InsertIfNotExistsByFilterItem<U>[] = entities.map((entity) => ({ filter: toNewEntity(entity) as FilterQuery<U>, entity }));
    return this.insertManyIfNotExistsByFilter(items);
  }

  async insertIfNotExistsByFilter<U extends T>(filter: FilterQuery<T>, entity: MaybeNewEntity<U>): Promise<U | undefined> {
    const document = mongoDocumentFromMaybeNewEntity(entity);

    const result = await this.collection.updateOne(filter, { $setOnInsert: document }, { upsert: true });

    if (result.upsertedCount == 0) {
      return undefined;
    }

    return toEntity(document);
  }

  async insertManyIfNotExistsByFilter<U extends T>(items: InsertIfNotExistsByFilterItem<U>[]): Promise<U[]> {
    if (items.length == 0) {
      return [];
    }

    const mapped = Enumerable.from(items)
      .map(({ filter, entity }) => ({ filter, document: mongoDocumentFromMaybeNewEntity(entity) }))
      .map(({ filter, document }) => ({ document, operation: updateOneOperation(filter, { $setOnInsert: document }, { upsert: true }) }))
      .toArray();

    const operations = mapped.map((o) => o.operation as BulkWriteUpdateOneOperation<MongoDocument<T>>);
    const result = await this.collection.bulkWrite(operations, { ordered: false });
    assertDefined(result.upsertedIds);
    const entities = Object.keys(result.upsertedIds).map((index) => toEntity(mapped[index as unknown as number].document));

    return entities;
  }

  async load<U extends T = T>(id: string, includeDeleted: boolean, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoad<U>(id, includeDeleted, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoad<U extends T = T>(id: string, includeDeleted: boolean, options?: LoadOptions<U>): Promise<U | undefined> {
    const filter = getBasicFilterQuery<U>({ ids: id, includeDeleted });
    return this.tryLoadByFilter(filter, options);
  }

  async loadAndUpdate<U extends T = T>(id: string, update: UpdateQuery<U>, includeDeleted: boolean, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndUpdate(id, update, includeDeleted, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadAndUpdate<U extends T = T>(id: string, update: UpdateQuery<U>, includeDeleted: boolean, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const filter = getBasicFilterQuery<U>({ ids: id, includeDeleted });
    return this.tryLoadByFilterAndUpdate(filter, update, options);
  }

  async loadAndDelete<U extends T = T>(id: string, includeDeleted: boolean, physically: boolean, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndDelete<U>(id, includeDeleted, physically, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async loadByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilter(filter, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadOptions<U>): Promise<U | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, options as object);

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P>> {
    const id = await this.tryLoadProjectedByFilter(filter, mode, projection, options);
    return throwIfUndefinedElsePass(id, this.entityName);
  }

  async tryLoadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P> | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object);

    if (document == undefined) {
      return undefined;
    }

    return toProjectedEntity<U, M, P>(document);
  }

  async loadByFilterAndDelete<U extends T = T>(filter: FilterQuery<U>, physically: boolean, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndDelete(filter, physically, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadAndDelete<U extends T = T>(id: string, includeDeleted: boolean, physically: boolean, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    const filter = getBasicFilterQuery<U>({ ids: id, includeDeleted });
    return this.tryLoadByFilterAndDelete(filter, physically, options);
  }

  async tryLoadByFilterAndDelete<U extends T = T>(filter: FilterQuery<U>, physically: boolean, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    if (!physically) {
      return this.tryLoadByFilterAndUpdate(filter, { $set: { deleted: (currentTimestamp() as Entity['deleted']) } } as UpdateQuery<U>, { ...options, returnOriginal: false });
    }

    const result = await this.collection.findOneAndDelete(filter, options as object);

    if (result.value == undefined) {
      return undefined;
    }

    return toEntity(result.value as MongoDocument<U>);
  }

  async loadByFilterAndUpdate<U extends T = T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndUpdate(filter, update, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadByFilterAndUpdate<U extends T = T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const { value: document } = await this.collection.findOneAndUpdate(filter, update as UpdateQuery<T>, options as object) as FindAndModifyWriteOpResultObject<MongoDocument<U>>;

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadManyById<U extends T = T>(ids: string[], includeDeleted: boolean, options?: LoadManyOptions<U>): Promise<U[]> {
    const filter = getBasicFilterQuery<U>({ ids, includeDeleted });
    return this.loadManyByFilter(filter, options);
  }

  async loadManyByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadManyOptions<U>): Promise<U[]> {
    const documents = await this.collection.find(filter, options as object).toArray();
    return documents.map(toEntity) as U[];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  loadManyByIdWithCursor<U extends T = T>(ids: string[], includeDeleted: boolean): AsyncIterableIterator<U> {
    const filter = getBasicFilterQuery<U>({ ids, includeDeleted });
    return this.loadManyByFilterWithCursor(filter);
  }

  async *loadManyByFilterWithCursor<U extends T = T>(filter: FilterQuery<U>, options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter, options as object);

    for await (const document of cursor) {
      const entity = toEntity(document);
      yield entity;
    }
  }

  async loadManyProjectedById<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(ids: string, includeDeleted: boolean, mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    const filter = getBasicFilterQuery<U>({ ids, includeDeleted });
    return this.loadManyProjectedByFilter(filter, mode, projection, options);
  }

  async loadManyProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    const documents = await this.collection.find<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object).toArray();
    return documents.map(toProjectedEntity) as ProjectedEntity<U, M, P>[];
  }

  async *loadManyProjectedByFilterWithCursor<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadManyOptions<U>): AsyncIterableIterator<ProjectedEntity<U, M, P>> {
    const cursor = this.collection.find<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object);

    for await (const document of cursor) {
      const entity = toProjectedEntity<U, M, P>(document);
      yield entity;
    }
  }

  async deleteById(id: string, physically: boolean): Promise<boolean> {
    const filter = getBasicFilterQuery({ ids: id, includeDeleted: true });
    return this.deleteByFilter(filter, physically);
  }

  async deleteManyById(ids: string[], physically: boolean): Promise<number> {
    if (ids.length == 0) {
      return 0;
    }

    const filter = getBasicFilterQuery({ ids, includeDeleted: true });
    return this.deleteManyByFilter(filter, physically);
  }

  async deleteByFilter<U extends T = T>(filter: FilterQuery<U>, physically: boolean): Promise<boolean> {
    if (!physically) {
      const { modifiedCount } = await this.update(filter, { $set: { deleted: currentTimestamp() } } as UpdateQuery<U>);
      return modifiedCount == 1;
    }

    const { deletedCount } = await this.collection.deleteOne(filter);
    return deletedCount == 1;
  }

  async deleteManyByFilter<U extends T = T>(filter: FilterQuery<U>, physically: boolean): Promise<number> {
    if (!physically) {
      const { modifiedCount } = await this.updateMany(filter, { $set: { deleted: currentTimestamp() } } as UpdateQuery<U>);
      return modifiedCount;
    }

    const { deletedCount } = await this.collection.deleteMany(filter);
    return deletedCount as number;
  }

  async undeleteById(id: string): Promise<boolean> {
    const filter = getBasicFilterQuery({ ids: id, includeDeleted: true });
    return this.undeleteByFilter(filter);
  }

  async undeleteManyById(ids: string[]): Promise<number> {
    if (ids.length == 0) {
      return 0;
    }

    const filter = getBasicFilterQuery({ ids, includeDeleted: true });
    return this.undeleteManyByFilter(filter);
  }

  async undeleteByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const { modifiedCount } = await this.update(filter, { $set: { deleted: undefined } } as UpdateQuery<U>);
    return modifiedCount == 1;
  }

  async undeleteManyByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<number> {
    const { modifiedCount } = await this.updateMany(filter, { $set: { deleted: undefined } } as UpdateQuery<U>);
    return modifiedCount;
  }

  async replace<U extends T>(entity: U, includeDeleted: boolean, options?: ReplaceOptions): Promise<boolean> {
    const document = toMongoDocument(entity);
    const { replaceOne: { filter, replacement } } = replaceOneOperation(document, includeDeleted, currentTimestamp(), options);
    const result = await this.collection.replaceOne(filter, replacement, options);

    return (result.matchedCount + result.upsertedCount) > 0;
  }

  async replaceByFilter<U extends T>(filter: FilterQuery<U>, entity: U, options?: ReplaceOptions): Promise<boolean> {
    const document = toMongoDocument(entity);
    const result = await this.collection.replaceOne(filter, document, options);

    return (result.matchedCount + result.upsertedCount) > 0;
  }

  async replaceMany<U extends T>(entities: U[], includeDeleted: boolean, options?: ReplaceOptions): Promise<number> {
    if (entities.length == 0) {
      return 0;
    }

    const timestamp = currentTimestamp();
    const documents = entities.map(toMongoDocument);
    const operations = documents.map((document) => replaceOneOperation(document, includeDeleted, timestamp, options));
    const result = await this.collection.bulkWrite(operations);

    if (result.matchedCount == undefined || result.upsertedCount == undefined) {
      throw new Error('unexpected bulkWrite response');
    }

    if (result.matchedCount + result.upsertedCount != entities.length) {
      throw new NotFoundError(`${entities.length - (result.matchedCount + result.upsertedCount)} ${this.entityName} entities not found`);
    }

    return (result.matchedCount + result.upsertedCount);
  }

  async update<U extends T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: UpdateOptions): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateOne(filter, update as UpdateQuery<T>, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async updateMany<U extends T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: UpdateOptions): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateMany(filter, update as UpdateQuery<T>, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async has(id: string, includeDeleted: boolean): Promise<boolean> {
    const filter = getBasicFilterQuery({ ids: id, includeDeleted });
    return this.hasByFilter(filter);
  }

  async hasByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const count = await this.countByFilter(filter, { limit: 1 });
    return count > 0;
  }

  async hasMany(ids: string[], includeDeleted: boolean): Promise<string[]> {
    const filter = getBasicFilterQuery({ ids, includeDeleted });

    const result = await this.collection.distinct('_id', filter) as string[];
    return result;
  }

  async hasAll(ids: string[], includeDeleted: boolean): Promise<boolean> {
    const filter = getBasicFilterQuery({ ids, includeDeleted });
    const count = await this.countByFilter(filter);
    return count == ids.length;
  }

  async countByFilter<U extends T = T>(filter: FilterQuery<U>, { estimate, limit, skip }: CountOptions = {}): Promise<number> {
    if (estimate == true) {
      return this.collection.estimatedDocumentCount(filter, { limit, skip });
    }

    return this.collection.countDocuments(filter, { limit, skip });
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

export function getBasicFilterQuery<T extends Entity>({ ids, includeDeleted }: { ids?: string | string[], includeDeleted: boolean }): FilterQuery<T> {
  const filter: FilterQuery<Entity> = {};

  if (ids != undefined) {
    filter._id = Array.isArray(ids) ? { $in: ids } : ids;
  }

  if (!includeDeleted) {
    filter.deleted = { $eq: undefined };
  }

  return filter;
}

export function insertOneOperation<T extends Entity>(document: MongoDocument<T>): BulkWriteInsertOneOperation<MongoDocument<T>> {
  const operation: BulkWriteInsertOneOperation<MongoDocument<T>> = {
    insertOne: {
      document: document as any
    }
  };

  return operation;
}

export function replaceOneOperation<T extends Entity>(document: MongoDocument<T>, includeDeleted: boolean, updatedTimestamp: NonNullable<Entity['updated']>, options: ReplaceOptions = {}): BulkWriteReplaceOneOperation<MongoDocument<T>> {
  const filter = getBasicFilterQuery({ ids: document._id, includeDeleted });

  const operation = {
    replaceOne: {
      filter,
      replacement: { ...document, updated: updatedTimestamp },
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateOneOperation<T extends Entity>(filter: FilterQuery<T>, update: UpdateQuery<T>, options: UpdateOptions = {}): BulkWriteUpdateOneOperation<MongoDocument<T>> {
  const operation: BulkWriteUpdateOneOperation<MongoDocument<T>> = {
    updateOne: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateManyOperation<T extends Entity>(filter: FilterQuery<T>, update: UpdateQuery<T>, options: UpdateOptions = {}): BulkWriteUpdateManyOperation<MongoDocument<T>> {
  const operation: BulkWriteUpdateManyOperation<MongoDocument<T>> = {
    updateMany: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function deleteOneOperation<T extends Entity>(filter: FilterQuery<T>): BulkWriteDeleteOneOperation<MongoDocument<T>> {
  const operation: BulkWriteDeleteOneOperation<MongoDocument<T>> = {
    deleteOne: {
      filter
    }
  };

  return operation;
}

export function deleteManyOperation<T extends Entity>(filter: FilterQuery<T>): BulkWriteDeleteManyOperation<MongoDocument<T>> {
  const operation: BulkWriteDeleteManyOperation<MongoDocument<T>> = {
    deleteMany: {
      filter
    }
  };

  return operation;
}

function throwIfUndefinedElsePass<T>(value: T | undefined, entityName: string): T {
  if (value == undefined) {
    throw new NotFoundError(`${entityName} not found`);
  }

  return value;
}
