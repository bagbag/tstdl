
import type { Entity, MaybeNewEntity } from '#/database';
import { Enumerable } from '#/enumerable';
import { NotFoundError } from '#/error';
import type { Record } from '#/types';
import { assertDefined, isNullOrUndefined } from '#/utils/type-guards';
import type { FindOneAndUpdateOptions, IndexDescription } from 'mongodb';
import type { Collection } from './classes';
import type { MongoDocument } from './model';
import { mongoDocumentFromMaybeNewEntity, toEntity, toMongoDocument, toMongoProjection, toNewEntity, toProjectedEntity } from './model';
import { MongoBulk } from './mongo-bulk';
import { replaceOneOperation, updateOneOperation } from './operations';
import type { Filter, Sort, TypedIndexDescription, UpdateFilter, UpdateOneOperation } from './types';

export const enum ProjectionMode {
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

export type InsertIfNotExistsByFilterItem<T extends Entity> = {
  filter: Filter<T>,
  entity: MaybeNewEntity<T>
};

export class MongoBaseRepository<T extends Entity> {
  readonly collection: Collection<T>;

  constructor(collection: Collection<T>) {
    this.collection = collection;
  }

  async createIndexes(indexes: TypedIndexDescription<T>[]): Promise<void> {
    await this.collection.createIndexes(indexes as IndexDescription[]);
  }

  bulk(): MongoBulk<T> {
    return new MongoBulk(this.collection);
  }

  async insert<U extends T>(entity: MaybeNewEntity<U>): Promise<U> {
    const document = mongoDocumentFromMaybeNewEntity(entity);
    await this.collection.insertOne(document as any); // eslint-disable-line @typescript-eslint/no-unsafe-argument

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
    const filter: Filter = toNewEntity(entity);
    return this.insertIfNotExistsByFilter(filter as Filter<T>, entity);
  }

  async insertManyIfNotExists<U extends T>(entities: MaybeNewEntity<U>[]): Promise<U[]> {
    const items: InsertIfNotExistsByFilterItem<U>[] = entities.map((entity) => ({ filter: toNewEntity(entity) as unknown as Filter<U>, entity }));
    return this.insertManyIfNotExistsByFilter(items);
  }

  async insertIfNotExistsByFilter<U extends T>(filter: Filter<T>, entity: MaybeNewEntity<U>): Promise<U | undefined> {
    const document = mongoDocumentFromMaybeNewEntity(entity);

    const result = await this.collection.updateOne(filter, { $setOnInsert: document } as any as UpdateFilter<T>, { upsert: true });

    if (result.upsertedCount == 0) {
      return undefined;
    }

    return toEntity(document);
  }

  /**
   *
   * @param items
   * @returns inserted entities - entities which are already in the database are not returned
   */
  async insertManyIfNotExistsByFilter<U extends T>(items: InsertIfNotExistsByFilterItem<U>[]): Promise<U[]> {
    if (items.length == 0) {
      return [];
    }

    const mapped = Enumerable.from(items)
      .map(({ filter, entity }) => ({ filter, document: mongoDocumentFromMaybeNewEntity(entity) }))
      .map(({ filter, document }) => ({ document, operation: updateOneOperation(filter, { $setOnInsert: document } as UpdateFilter<U>, { upsert: true }) }))
      .toArray();

    const operations = mapped.map((o) => o.operation as UpdateOneOperation<T>);
    const result = await this.collection.bulkWrite(operations, { ordered: false });
    assertDefined(result.upsertedIds);
    const entities = Object.keys(result.upsertedIds).map((index) => toEntity(mapped[index as unknown as number]!.document));

    return entities;
  }

  async load<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoad(id, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async tryLoad<U extends T = T>(id: string, options?: LoadOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilter({ _id: id } as Filter<U>, options);
  }

  async loadAndUpdate<U extends T = T>(id: string, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndUpdate(id, update, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async tryLoadAndUpdate<U extends T = T>(id: string, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilterAndUpdate({ _id: id } as Filter<U>, update, options);
  }

  async loadAndDelete<U extends T = T>(id: string, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadAndDelete(id, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async loadByFilter<U extends T = T>(filter: Filter<U>, options?: LoadOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilter(filter, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async tryLoadByFilter<U extends T = T>(filter: Filter<U>, options?: LoadOptions<U>): Promise<U | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter as Filter<T>, options as object);

    if (isNullOrUndefined(document)) {
      return undefined;
    }

    return toEntity(document);
  }

  async loadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = Record<string, never>>(filter: Filter<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P>> {
    const id = await this.tryLoadProjectedByFilter(filter, mode, projection, options);
    return throwIfUndefinedElsePass(id, this.collection.collectionName);
  }

  async tryLoadProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = Record<string, never>>(filter: Filter<U>, mode: M, projection: P, options?: LoadOptions<U>): Promise<ProjectedEntity<U, M, P> | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter as Filter<T>, { ...options, projection: toMongoProjection(mode, projection) } as object);

    if (isNullOrUndefined(document)) {
      return undefined;
    }

    return toProjectedEntity<U, M, P>(document);
  }

  async loadByFilterAndDelete<U extends T = T>(filter: Filter<U>, options?: LoadAndDeleteOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndDelete(filter, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async tryLoadAndDelete<U extends T = T>(id: string, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    return this.tryLoadByFilterAndDelete({ _id: id } as Filter<U>, options);
  }

  async tryLoadByFilterAndDelete<U extends T = T>(filter: Filter<U>, options?: LoadAndDeleteOptions<U>): Promise<U | undefined> {
    const result = await this.collection.findOneAndDelete(filter as Filter<T>, options as object);

    if (result.value == undefined) {
      return undefined;
    }

    return toEntity(result.value as unknown as MongoDocument<U>);
  }

  async loadByFilterAndUpdate<U extends T = T>(filter: Filter<U>, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U> {
    const entity = await this.tryLoadByFilterAndUpdate(filter, update, options);
    return throwIfUndefinedElsePass(entity, this.collection.collectionName);
  }

  async tryLoadByFilterAndUpdate<U extends T = T>(filter: Filter<U>, update: UpdateFilter<U>, options?: LoadAndUpdateOptions<U>): Promise<U | undefined> {
    const { value: document } = await this.collection.findOneAndUpdate(filter as Filter<T>, update as UpdateFilter<T>, options as object);

    if (document == undefined) {
      return undefined;
    }

    return toEntity(document) as U;
  }

  async loadManyById<U extends T = T>(ids: string[], options?: LoadManyOptions<U>): Promise<U[]> {
    const filter: Filter = { _id: { $in: ids } };
    return this.loadManyByFilter(filter as Filter<U>, options);
  }

  async loadManyByFilter<U extends T = T>(filter: Filter<U>, options?: LoadManyOptions<U>): Promise<U[]> {
    const documents = await this.collection.find(filter as Filter<T>, options as object).toArray();
    return documents.map(toEntity) as U[];
  }

  // eslint-disable-next-line @typescript-eslint/require-await
  loadManyByIdWithCursor<U extends T = T>(ids: string[], options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    const filter: Filter = { _id: { $in: ids } };
    return this.loadManyByFilterWithCursor(filter as Filter<U>, options);
  }

  async *loadManyByFilterWithCursor<U extends T = T>(filter: Filter<U>, options?: LoadManyOptions<U>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter as Filter<T>, options as object);

    for await (const document of cursor) {
      if (isNullOrUndefined(document)) {
        continue;
      }

      yield toEntity(document);
    }
  }

  async loadManyProjectedById<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = Record<string, never>>(ids: string[], mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    const filter: Filter = { _id: { $in: ids } };
    return this.loadManyProjectedByFilter(filter as Filter<U>, mode, projection, options);
  }

  async loadManyProjectedByFilter<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = Record<string, never>>(filter: Filter<U>, mode: M, projection: P, options?: LoadManyOptions<U>): Promise<ProjectedEntity<U, M, P>[]> {
    const documents = await this.collection.find<MongoDocument<U>>(filter as Filter<T>, { ...options, projection: toMongoProjection(mode, projection) } as object).toArray();
    return documents.map(toProjectedEntity) as ProjectedEntity<U, M, P>[];
  }

  async * loadManyProjectedByFilterWithCursor<U extends T = T, M extends ProjectionMode = ProjectionMode.Include, P extends Projection<U, M> = Record<string, never>>(filter: Filter<U>, mode: M, projection: P, options?: LoadManyOptions<U>): AsyncIterableIterator<ProjectedEntity<U, M, P>> {
    const cursor = this.collection.find<MongoDocument<U>>(filter as Filter<T>, { ...options, projection: toMongoProjection(mode, projection) } as object);

    for await (const document of cursor) {
      if (isNullOrUndefined(document)) {
        continue;
      }

      yield toProjectedEntity<U, M, P>(document);
    }
  }

  async deleteById(id: string): Promise<boolean> {
    return this.deleteByFilter({ _id: id } as Filter<T>);
  }

  async deleteManyById(ids: string[]): Promise<number> {
    if (ids.length == 0) {
      return 0;
    }

    const filter: Filter = { _id: { $in: ids } };
    return this.deleteManyByFilter(filter as Filter<T>);
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
    return this.replaceByFilter({ _id: entity.id } as Filter<U>, entity, options);
  }

  async replaceByFilter<U extends T>(filter: Filter<U>, entity: U, options: ReplaceOptions = {}): Promise<boolean> {
    const document = toMongoDocument<T>(entity);
    const result = await this.collection.replaceOne(filter as Filter<T>, document, options);

    return ((result.matchedCount as number) + (result.upsertedCount as number)) > 0;
  }

  async replaceMany<U extends T>(entities: U[], options?: ReplaceOptions): Promise<number> {
    if (entities.length == 0) {
      return 0;
    }

    const documents = entities.map(toMongoDocument) as MongoDocument<T>[];
    const operations = documents.map((document) => replaceOneOperation<T>({ _id: document._id } as Filter<T>, document, options));
    const result = await this.collection.bulkWrite(operations);

    if (result.matchedCount + result.upsertedCount != entities.length) {
      throw new NotFoundError(`${entities.length - (result.matchedCount + result.upsertedCount)} entities in ${this.collection.collectionName} not found`);
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

  async has(id: string): Promise<boolean> {
    return this.hasByFilter({ _id: id } as Filter<T>);
  }

  async hasByFilter<U extends T = T>(filter: Filter<U>): Promise<boolean> {
    const count = await this.countByFilter(filter, { limit: 1 });
    return count > 0;
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const filter: Filter = { _id: { $in: ids } };
    const result = await this.collection.distinct('_id', filter as Filter<T>);
    return result;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const filter: Filter = { _id: { $in: ids } };
    const count = await this.countByFilter(filter as Filter<T>);
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

function throwIfUndefinedElsePass<T>(value: T | undefined, collectionName: string): T {
  if (value == undefined) {
    throw new NotFoundError(`entity not found in ${collectionName}`);
  }

  return value;
}
