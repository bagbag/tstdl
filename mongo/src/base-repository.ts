/* eslint-disable @typescript-eslint/naming-convention */

import { AsyncEnumerable } from '@tstdl/base/enumerable';
import { NotFoundError } from '@tstdl/base/error';
import { Entity, EntityWithPartialId } from '@tstdl/database';
import { BulkWriteInsertOneOperation, FindAndModifyWriteOpResultObject } from 'mongodb';
import { MongoDocument, toEntity, toMongoDocumentWithId, toMongoProjection, toProjectedEntity } from './model';
import { Collection, FilterQuery, TypedIndexSpecification, UpdateQuery } from './types';

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

export type Sort<T extends Entity> = SortObject<T> | SortArray<T>;

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

export type LoadAndDeleteOptions<T extends Entity> = LoadOptions<T> & {
  sort: SortObject<T>
};

export type LoadManyOptions<T extends Entity> = LoadOptions<T> & {
};

export type LoadAndUpdateOptions<T extends Entity> = LoadOptions<T> & {
  upsert?: boolean,
  returnOriginal?: boolean,
  sort: SortObject<T>
};

export type CountOptions = {
  estimate?: boolean,
  limit?: number,
  skip?: number
};

export class MongoBaseRepository<T extends Entity> {
  readonly collection: Collection<T>;

  constructor(collection: Collection<T>) {
    this.collection = collection;
  }

  async createIndexes(indexes: TypedIndexSpecification<T>[]): Promise<void> {
    await this.collection.createIndexes(indexes);
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    const document = toMongoDocumentWithId(entity);
    await this.collection.insertOne(document as any);

    return toEntity(document);
  }

  async load<U extends T = T>(id: string): Promise<U> {
    const entity = await this.tryLoad<U>(id);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoad<U extends T = T>(id: string): Promise<U | undefined> {
    const filter: FilterQuery<U> = {
      _id: id
    } as FilterQuery<U>;

    return this.tryLoadByFilter(filter);
  }

  async loadAndUpdate<U extends T = T>(id: string, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndUpdate(id, update, options);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoadAndUpdate<U extends T = T>(id: string, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const filter: FilterQuery<U> = {
      _id: id
    } as FilterQuery<U>;

    return this.tryLoadByFilterAndUpdate(filter, update, options);
  }

  async loadAndDelete<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndDelete<U>(id, options);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoadAndDelete<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U | undefined> {
    const filter: FilterQuery<U> = {
      _id: id
    } as FilterQuery<U>;

    return this.tryLoadByFilter(filter, options);
  }

  async loadByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilter(filter, options);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoadByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadOptions<U>): Promise<U | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, options);

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadProjectionByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P>> {
    const id = await this.tryLoadProjectionByFilter(filter, mode, projection, options);
    return throwIfUndefinedElsePass(id);
  }

  async tryLoadProjectionByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = {}>(filter: FilterQuery<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P> | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter, { ...options, projection: toMongoProjection(mode, projection) });

    if (document == undefined) {
      return undefined;
    }

    return toProjectedEntity<U, M, P>(document);
  }

  async loadByFilterAndDelete<U extends T = T>(filter: FilterQuery<U>, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndDelete(filter, options);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoadByFilterAndDelete<U extends T = T>(filter: FilterQuery<U>, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    const result = await this.collection.findOneAndDelete(filter, options);

    if (result.value == undefined) {
      return undefined;
    }

    return toEntity(result.value as MongoDocument<U>);
  }

  async loadByFilterAndUpdate<U extends T = T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndUpdate(filter, update, options);
    return throwIfUndefinedElsePass(entity);
  }

  async tryLoadByFilterAndUpdate<U extends T = T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const { value: document } = await this.collection.findOneAndUpdate(filter, update, options) as FindAndModifyWriteOpResultObject<MongoDocument<U>>;

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadManyById<U extends T = T>(ids: string[]): Promise<U[]> {
    const iterator = this.loadManyByIdWithCursor<U>(ids);
    return AsyncEnumerable.from(iterator).toArray();
  }

  async loadManyByFilter<U extends T = T>(filter: FilterQuery<U>, options?: LoadManyOptions<U>): Promise<U[]> {
    const iterator = this.loadManyByFilterWithCursor<U>(filter, options);
    return AsyncEnumerable.from(iterator).toArray();
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  async *loadManyByIdWithCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    const filter: FilterQuery<U> = {
      _id: { $in: ids }
    } as FilterQuery<U>;

    yield* this.loadManyByFilterWithCursor(filter);
  }

  async *loadManyByFilterWithCursor<U extends T = T>(filter: FilterQuery<U>, options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter, options);

    for await (const document of cursor) {
      const entity = toEntity(document);
      yield entity;
    }
  }

  async delete<U extends T = T>(entity: U): Promise<boolean> {
    return this.deleteById(entity.id);
  }

  async deleteById(id: string): Promise<boolean> {
    const filter: FilterQuery<T> = {
      _id: id
    } as FilterQuery<T>;

    return this.deleteByFilter(filter);
  }

  async deleteMany<U extends T = T>(entities: U[]): Promise<number> {
    const ids = entities.map((entity) => entity.id);
    return this.deleteManyById(ids);
  }

  async deleteManyById(ids: string[]): Promise<number> {
    if (ids.length == 0) {
      return 0;
    }

    const filter: FilterQuery<T> = {
      _id: { $in: ids }
    } as FilterQuery<T>;

    return this.deleteManyByFilter(filter);
  }

  async deleteByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const { deletedCount } = await this.collection.deleteOne(filter);
    return deletedCount == 1;
  }

  async deleteManyByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<number> {
    const { deletedCount } = await this.collection.deleteMany(filter);
    return deletedCount as number;
  }

  async replace<U extends T>(entity: EntityWithPartialId<U>, options?: ReplaceOptions): Promise<U> {
    const document = toMongoDocumentWithId(entity);
    const { replaceOne: { filter, replacement } } = toReplaceOneOperation(document, options);
    const result = await this.collection.replaceOne(filter, replacement, options);

    if (result.matchedCount == 0 && result.upsertedCount == 0) {
      throw new NotFoundError('document not found');
    }

    return toEntity(document);
  }

  async replaceByFilter<U extends T>(filter: FilterQuery<U>, entity: EntityWithPartialId<U>, options?: ReplaceOptions): Promise<U> {
    const document = toMongoDocumentWithId(entity);
    const result = await this.collection.replaceOne(filter, document, options);

    if (result.matchedCount == 0 && result.upsertedCount == 0) {
      throw new NotFoundError('document not found');
    }

    return toEntity(document);
  }

  async insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents = entities.map(toMongoDocumentWithId);
    const operations = documents.map(toInsertOneOperation);
    await this.collection.bulkWrite(operations as any);

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async replaceMany<U extends T>(entities: EntityWithPartialId<U>[], options?: ReplaceOptions): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents = entities.map(toMongoDocumentWithId);
    const operations = documents.map((document) => toReplaceOneOperation(document, options));
    const result = await this.collection.bulkWrite(operations);

    if (result.matchedCount == undefined || result.upsertedCount == undefined) {
      throw new Error('unexpected bulkWrite response');
    }

    if (result.matchedCount + result.upsertedCount != entities.length) {
      throw new NotFoundError(`${entities.length - (result.matchedCount + result.upsertedCount)} documents not found`);
    }

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async update<U extends T>(filter: FilterQuery<U>, update: Partial<MongoDocument<U>> | UpdateQuery<U>, options?: UpdateOptions): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateOne(filter, update, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async updateMany<U extends T>(filter: FilterQuery<U>, update: Partial<MongoDocument<U>> | UpdateQuery<U>, options?: UpdateOptions): Promise<UpdateResult> {
    const { matchedCount, modifiedCount } = await this.collection.updateMany(filter, update, options);

    const updateResult: UpdateResult = {
      matchedCount,
      modifiedCount
    };

    return updateResult;
  }

  async has(id: string): Promise<boolean> {
    const filter: FilterQuery<T> = { _id: id } as FilterQuery<T>;
    return this.hasByFilter(filter);
  }

  async hasByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const count = await this.countByFilter(filter);
    return count > 0;
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const filter: FilterQuery<T> = {
      _id: { $in: ids }
    } as FilterQuery<T>;

    const result = await this.collection.distinct('_id', filter) as string[];
    return result;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const filter: FilterQuery<T> = { _id: { $in: ids } } as FilterQuery<T>;
    const count = await this.countByFilter(filter);
    return count == ids.length;
  }

  async countByFilter<U extends T = T>(filter: FilterQuery<U>, { estimate, limit, skip }: CountOptions = { estimate: false }): Promise<number> {
    if (estimate == true) {
      return this.collection.estimatedDocumentCount(filter, { limit, skip });
    }

    return this.collection.countDocuments(filter, { limit, skip });
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function toInsertOneOperation<T extends Entity>(document: MongoDocument<T>): BulkWriteInsertOneOperation<MongoDocument<T>> {
  const operation: BulkWriteInsertOneOperation<MongoDocument<T>> = {
    insertOne: {
      document: document as any
    }
  };

  return operation;
}

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function toReplaceOneOperation<T extends Entity>(document: MongoDocument<T>, options?: ReplaceOptions) {
  const filter: FilterQuery<T> = {
    _id: document._id
  } as FilterQuery<T>;

  const operation = {
    replaceOne: {
      filter,
      replacement: document,
      upsert: options?.upsert ?? false
    }
  };

  return operation;
}

function throwIfUndefinedElsePass<T>(value: T | undefined): T {
  if (value == undefined) {
    throw new NotFoundError('document not found');
  }

  return value;
}
