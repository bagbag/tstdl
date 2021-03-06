/* eslint-disable @typescript-eslint/naming-convention, @typescript-eslint/ban-types */

import type { Entity, MaybeNewEntity } from '#/database';
import { getNewId } from '#/database';
import { Enumerable } from '#/enumerable';
import { NotFoundError } from '#/error';
import { assertDefined, assertDefinedPass, isNull, isUndefined } from '#/utils';
import type { FindOneAndUpdateOptions } from 'mongodb';
import type { MongoDocument } from './model';
import { mongoDocumentFromMaybeNewEntity, toEntity, toMongoDocument, toMongoProjection, toNewEntity, toProjectedEntity } from './model';
import { MongoBulk } from './mongo-bulk';
import type { Collection, DeleteManyBulkWriteOperation, DeleteOneBulkWriteOperation, Filter, InsertOneBulkWriteOperation, ReplaceOneBulkWriteOperation, Sort, TypedIndexDescription, UpdateManyBulkWriteOperation, UpdateOneBulkWriteOperation, UpdateFilter } from './types';

export enum ProjectionMode {
  Include = 0,
  Exclude = 1
}

export type Projection<T, M extends ProjectionMode> = { [P in keyof T]?: M extends ProjectionMode.Include ? true : false };

export type ProjectedEntity<T, M extends ProjectionMode, P extends Projection<T, M>> =
  M extends ProjectionMode.Include
  ? { [K in keyof T]: P[K] extends true ? T[K] : undefined }
  : { [K in keyof T]: P[K] extends false ? undefined : T[K] };

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
  returnDocument?: FindOneAndUpdateOptions['returnDocument'],
  sort?: Sort<T>
};

export type CountOptions = {
  limit?: number,
  skip?: number
};

export type MongoBaseRepositoryOptions = {
  entityName?: string
};

export type InsertIfNotExistsByFilterItem<T extends Entity> = {
  filter: Filter<T>,
  entity: MaybeNewEntity<T>
};

export class MongoBaseRepository<T extends Entity> {
  readonly collection: Collection<T>;
  readonly entityName: string;

  constructor(collection: Collection<T>, options?: MongoBaseRepositoryOptions) {
    this.collection = collection;
    this.entityName = options?.entityName ?? 'entity';
  }

  async createIndexes(indexes: TypedIndexDescription<T>[]): Promise<void> {
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

    const bulk = this.bulk();
    const documents = bulk.insertMany(entities);
    await bulk.execute();

    return documents;
  }

  async insertIfNotExists<U extends T>(entity: MaybeNewEntity<U>): Promise<U | undefined> {
    const filter: Filter<T> = toNewEntity(entity) as Filter<T>;
    return this.insertIfNotExistsByFilter(filter, entity);
  }

  async insertManyIfNotExists<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]> {
    const items: InsertIfNotExistsByFilterItem<U>[] = entities.map((entity) => ({ filter: toNewEntity(entity) as Filter<U>, entity }));
    return this.insertManyIfNotExistsByFilter(items);
  }

  async insertIfNotExistsByFilter<U extends T>(filter: Filter<T>, entity: MaybeNewEntity<U>): Promise<U | undefined> {
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

    const operations = mapped.map((o) => o.operation as UpdateOneBulkWriteOperation<T>);
    const result = await this.collection.bulkWrite(operations, { ordered: false });
    assertDefined(result.upsertedIds);
    const entities = Object.keys(result.upsertedIds).map((index) => toEntity(mapped[index as unknown as number]!.document));

    return entities;
  }

  async load<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoad<U>(id, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoad<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilter({ _id: id } as Filter<U>, options);
  }

  async loadAndUpdate<U extends T = T>(id: string, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndUpdate(id, update, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadAndUpdate<U extends T = T>(id: string, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilterAndUpdate({ _id: id } as Filter<U>, update, options);
  }

  async loadAndDelete<U extends T = T>(id: string, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndDelete<U>(id, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async loadByFilter<U extends T = T>(filter: Filter<U>, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilter(filter, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadByFilter<U extends T = T>(filter: Filter<U>, options?: LoadOptions<U>): Promise<U | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, options as object);

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: Filter<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P>> {
    const id = await this.tryLoadProjectedByFilter(filter, mode, projection, options);
    return throwIfUndefinedElsePass(id, this.entityName);
  }

  async tryLoadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: Filter<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P> | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object);

    if (document == undefined) {
      return undefined;
    }

    return toProjectedEntity<U, M, P>(document);
  }

  async loadByFilterAndDelete<U extends T = T>(filter: Filter<U>, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndDelete(filter, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadAndDelete<U extends T = T>(id: string, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilterAndDelete({ _id: id } as Filter<U>, options);
  }

  async tryLoadByFilterAndDelete<U extends T = T>(filter: Filter<U>, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    const result = await this.collection.findOneAndDelete(filter as Filter<T>, options as object);

    if (result.value == undefined) {
      return undefined;
    }

    return toEntity(result.value as MongoDocument<U>);
  }

  async loadByFilterAndUpdate<U extends T = T>(filter: Filter<U>, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndUpdate(filter, update, options);
    return throwIfUndefinedElsePass(entity, this.entityName);
  }

  async tryLoadByFilterAndUpdate<U extends T = T>(filter: Filter<U>, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const { value: document } = await this.collection.findOneAndUpdate(filter as Filter<T>, update as UpdateFilter<T>, options as object);

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document as MongoDocument<U>);
  }

  async loadManyById<U extends T = T>(ids: string[], options?: LoadManyOptions<U>): Promise<U[]> {
    return this.loadManyByFilter({ _id: { $in: ids } } as Filter<U>, options);
  }

  async loadManyByFilter<U extends T = T>(filter: Filter<U>, options?: LoadManyOptions<U>): Promise<U[]> {
    const documents = await this.collection.find(filter, options as object).toArray();
    return documents.map(toEntity);
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  loadManyByIdWithCursor<U extends T = T>(ids: string[], options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    return this.loadManyByFilterWithCursor({ _id: { $in: ids } } as Filter<U>, options);
  }

  async *loadManyByFilterWithCursor<U extends T = T>(filter: Filter<U>, options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter, options as object);

    for await (const document of cursor) {
      if (isNull(document)) {
        continue;
      }

      const entity = toEntity(document);
      yield entity;
    }
  }

  async loadManyProjectedById<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(ids: string, mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    return this.loadManyProjectedByFilter({ _id: { $in: ids } } as Filter<U>, mode, projection, options);
  }

  async loadManyProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: Filter<U>, mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    const documents = await this.collection.find<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object).toArray();
    return documents.map(toProjectedEntity) as ProjectedEntity<U, M, P>[];
  }

  async * loadManyProjectedByFilterWithCursor<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: Filter<U>, mode: M, projection: P, options?: LoadManyOptions<U>): AsyncIterableIterator<ProjectedEntity<U, M, P>> {
    const cursor = this.collection.find<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) } as object);

    for await (const document of cursor) {
      if (isNull(document)) {
        continue;
      }

      const entity = toProjectedEntity<U, M, P>(document);
      yield entity;
    }
  }

  async deleteById(id: string): Promise<boolean> {
    return this.deleteByFilter({ _id: id } as Filter<T>);
  }

  async deleteManyById(ids: string[]): Promise<number> {
    if (ids.length == 0) {
      return 0;
    }

    return this.deleteManyByFilter({ _id: { $in: ids } } as Filter<T>);
  }

  async deleteByFilter<U extends T = T>(filter: Filter<U>): Promise<boolean> {
    const { deletedCount } = await this.collection.deleteOne(filter as Filter<T>);
    return deletedCount == 1;
  }

  async deleteManyByFilter<U extends T = T>(filter: Filter<U>): Promise<number> {
    const { deletedCount } = await this.collection.deleteMany(filter as Filter<T>);
    return deletedCount;
  }

  async replace<U extends T>(entity: U, options: ReplaceOptions = {}): Promise<boolean> {
    const document = toMongoDocument(entity);
    const { replaceOne: { filter, replacement } } = replaceOneOperation(document, options);
    const result = await this.collection.replaceOne(filter as Filter<T>, replacement, options);

    return (result.matchedCount + result.upsertedCount) > 0;
  }

  async replaceByFilter<U extends T>(filter: Filter<U>, entity: U, options: ReplaceOptions = {}): Promise<boolean> {
    const document = toMongoDocument(entity);
    const result = await this.collection.replaceOne(filter as Filter<T>, document, options);

    return (result.matchedCount + result.upsertedCount) > 0;
  }

  async replaceMany<U extends T>(entities: U[], options?: ReplaceOptions): Promise<number> {
    if (entities.length == 0) {
      return 0;
    }

    const documents = entities.map(toMongoDocument);
    const operations = documents.map((document) => replaceOneOperation<T>(document, options));
    const result = await this.collection.bulkWrite(operations);

    if (result.matchedCount + result.upsertedCount != entities.length) {
      throw new NotFoundError(`${entities.length - (result.matchedCount + result.upsertedCount)} ${this.entityName} entities not found`);
    }

    return (result.matchedCount + result.upsertedCount);
  }

  async update<U extends T>(filter: Filter<U>, update: UpdateFilter<U>, options: UpdateOptions = {}): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateOne(filter as Filter<T>, update as UpdateFilter<T>, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async updateMany<U extends T>(filter: Filter<U>, update: UpdateFilter<U>, options: UpdateOptions = {}): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateMany(filter as Filter<T>, update as UpdateFilter<T>, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async replaceByFilterOrInsert<U extends T>(filter: Filter<U>, entity: MaybeNewEntity<U>): Promise<U> {
    const document = mongoDocumentFromMaybeNewEntity(entity);
    const update: UpdateFilter<U> = { $set: document };

    if (isUndefined(entity.id)) {
      update.$setOnInsert = { _id: getNewId() } as MongoDocument<U>;
    }

    const result = await this.collection.findOneAndReplace(filter as Filter<T>, update, { upsert: true, returnDocument: 'after' });
    return toEntity<U>(assertDefinedPass(result.value as MongoDocument<U>));
  }

  async has(id: string): Promise<boolean> {
    return this.hasByFilter({ _id: id } as Filter<T>);
  }

  async hasByFilter<U extends T = T>(filter: Filter<U>): Promise<boolean> {
    const count = await this.countByFilter(filter, { limit: 1 });
    return count > 0;
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const result = await this.collection.distinct('_id', { _id: { $in: ids } } as Filter<T>);
    return result;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const count = await this.countByFilter({ _id: { $in: ids } } as Filter<T>);
    return count == ids.length;
  }

  async countByFilter<U extends T = T>(filter: Filter<U>, { limit, skip }: CountOptions = {}): Promise<number> {
    return this.collection.countDocuments(filter as Filter<T>, { limit, skip });
  }

  async countByFilterEstimated(): Promise<number> {
    return this.collection.estimatedDocumentCount();
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

export function insertOneOperation<T extends Entity>(document: MongoDocument<T>): InsertOneBulkWriteOperation<T> {
  const operation: InsertOneBulkWriteOperation<T> = {
    insertOne: {
      document: document as any
    }
  };

  return operation;
}

export function replaceOneOperation<T extends Entity>(document: MongoDocument<T>, options: ReplaceOptions = {}): ReplaceOneBulkWriteOperation<T> {
  const operation: ReplaceOneBulkWriteOperation<T> = {
    replaceOne: {
      filter: { _id: document._id } as Filter<T>,
      replacement: { ...document },
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateOneOperation<T extends Entity>(filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): UpdateOneBulkWriteOperation<T> {
  const operation: UpdateOneBulkWriteOperation<T> = {
    updateOne: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateManyOperation<T extends Entity>(filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): UpdateManyBulkWriteOperation<T> {
  const operation: UpdateManyBulkWriteOperation<T> = {
    updateMany: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function deleteOneOperation<T extends Entity>(filter: Filter<T>): DeleteOneBulkWriteOperation<T> {
  const operation: DeleteOneBulkWriteOperation<T> = {
    deleteOne: {
      filter
    }
  };

  return operation;
}

export function deleteManyOperation<T extends Entity>(filter: Filter<T>): DeleteManyBulkWriteOperation<T> {
  const operation: DeleteManyBulkWriteOperation<T> = {
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
