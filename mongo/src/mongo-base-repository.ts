import { AsyncEnumerable } from '@tstdl/base/enumerable';
import { Entity, EntityWithPartialId } from '@tstdl/database';
import { MongoDocument, toEntity, toMongoDocument, toMongoDocumentWithNewId } from './mongo-document';
import { Collection, FilterQuery, UpdateQuery } from './types';

export class MongoBaseRepository<T extends Entity> {
  private readonly collection: Collection<T>;

  constructor(collection: Collection<T>) {
    this.collection = collection;
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    const document = toMongoDocumentWithNewId(entity);
    const result = await this.collection.insertOne(document);

    return toEntity(document);
  }

  async replace<U extends T>(entity: EntityWithPartialId<U>, upsert: boolean): Promise<U> {
    const document = toMongoDocumentWithNewId(entity);
    const { replaceOne: { filter, replacement } } = toReplaceOneOperation(document, upsert);
    await this.collection.replaceOne(filter, replacement, { upsert });

    return toEntity(document);
  }

  async insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents = entities.map(toMongoDocumentWithNewId);
    const operations = documents.map(toInsertOneOperation);
    const bulkWriteResult = await this.collection.bulkWrite(operations);

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async replaceMany<U extends T>(entities: EntityWithPartialId<U>[], upsert: boolean): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents = entities.map(toMongoDocumentWithNewId);
    const operations = documents.map((document) => toReplaceOneOperation(document, upsert));
    const bulkWriteResult = await this.collection.bulkWrite(operations);

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async insertOrReplace<U extends T>(entities: EntityWithPartialId<U>[], upsert: boolean): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const documents: MongoDocument<U>[] = [];
    const operations: object[] = [];

    for (const entity of entities) {
      let operation: object;

      if (entity.id == undefined) {
        const document = toMongoDocumentWithNewId(entity);
        operation = toInsertOneOperation(document);

        documents.push(document);
      }
      else {
        const document = toMongoDocument(entity as U);
        operation = toReplaceOneOperation(document, upsert);

        documents.push(document);
      }

      operations.push(operation);
    }

    const bulkWriteResult = await this.collection.bulkWrite(operations);

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async update<U extends T>(filter: FilterQuery<U>, update: MongoDocument<U> | UpdateQuery<U>): Promise<void> {
    this.collection.updateOne(filter, update as MongoDocument<U> | UpdateQuery<T>);
  }

  async load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean = true): Promise<U | undefined> {
    const filter: FilterQuery<U> = {
      _id: id
    } as FilterQuery<U>;

    return this.loadByFilter(filter, throwIfNotFound);
  }

  async loadByFilter<U extends T = T>(filter: FilterQuery<U>, throwIfNotFound?: true): Promise<U>;
  async loadByFilter<U extends T = T>(filter: FilterQuery<U>, throwIfNotFound: boolean): Promise<U | undefined>;
  async loadByFilter<U extends T = T>(filter: FilterQuery<U>, throwIfNotFound: boolean = true): Promise<U | undefined> {
    const document = await this.collection.findOne<MongoDocument<U>>(filter);

    if (document == undefined) {
      if (throwIfNotFound) {
        throw new Error('document not found');
      }

      return undefined;
    }

    const entity = toEntity(document);
    return entity;
  }


  async loadManyById<U extends T = T>(ids: string[]): Promise<U[]> {
    const iterator = this.loadManyByIdWithCursor<U>(ids);
    return AsyncEnumerable.from(iterator).toArray();
  }

  async loadManyByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<U[]> {
    const iterator = this.loadManyByFilterWithCursor<U>(filter);
    return AsyncEnumerable.from(iterator).toArray();
  }

  async *loadManyByIdWithCursor<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    const filter: FilterQuery<U> = {
      _id: { $in: ids }
    } as FilterQuery<U>;

    yield* this.loadManyByFilterWithCursor(filter);
  }

  async *loadManyByFilterWithCursor<U extends T = T>(filter: FilterQuery<U>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter);

    for await (const document of (cursor as AsyncIterable<MongoDocument<U>>)) {
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

    return this.deleteOneByFilter(filter);
  }

  async deleteMany<U extends T = T>(entities: U[]): Promise<number> {
    const ids = entities.map((entity) => entity.id);
    return this.deleteManyById(ids);
  }

  deleteManyById(ids: string[]): Promise<number> {
    const filter: FilterQuery<T> = {
      _id: { $in: ids }
    } as FilterQuery<T>;

    return this.deleteManyByFilter(filter);
  }

  async deleteOneByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const { deletedCount } = await this.collection.deleteOne(filter);
    return deletedCount == 1;
  }

  async deleteManyByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<number> {
    const { deletedCount } = await this.collection.deleteMany(filter);
    return deletedCount as number;
  }

  async countByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  async hasByFilter<U extends T = T>(filter: FilterQuery<U>): Promise<boolean> {
    const count = await this.countByFilter(filter);
    return count > 0;
  }

  async has(id: string): Promise<boolean> {
    const filter: FilterQuery<T> = { _id: id } as FilterQuery<T>;
    return this.hasByFilter(filter);
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const filter: FilterQuery<T> = {
      _id: { $in: ids }
    } as FilterQuery<T>;

    const result = await this.collection.distinct('_id', filter) as string[];
    return result;
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

// tslint:disable-next-line: typedef
function toInsertOneOperation<T extends Entity>(document: MongoDocument<T>) {
  const operation = {
    insertOne: {
      document
    }
  };

  return operation;
}

// tslint:disable-next-line: typedef
function toReplaceOneOperation<T extends Entity>(document: MongoDocument<T>, upsert: boolean) {
  const filter: FilterQuery<T> = {
    _id: document._id
  } as FilterQuery<T>;

  const operation = {
    replaceOne: {
      filter,
      replacement: document,
      upsert
    }
  };

  return operation;
}
