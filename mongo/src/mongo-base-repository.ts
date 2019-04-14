import { Entity, EntityWithPartialId } from '@common-ts/database';
import * as Mongo from 'mongodb';
import { MongoDocument, toEntity, toMongoDocumentWithNewId } from './mongo-document';

export type FilterQuery<T extends Entity> = Mongo.FilterQuery<MongoDocument<T>>;

export class MongoBaseRepository<T extends Entity> {
  private readonly collection: Mongo.Collection<MongoDocument<T>>;

  constructor(collection: Mongo.Collection<MongoDocument<T>>) {
    this.collection = collection;
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    const document = toMongoDocumentWithNewId(entity);

    const result = await this.collection.insertOne(document);

    if (result.insertedId != undefined) {
      throw new Error('should not happen?!');
    }

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

    if (Object.keys(bulkWriteResult.insertedIds).length > 0) {
      throw new Error('should not happen?!');
    }

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

    if (Object.keys(bulkWriteResult.insertedIds).length > 0) {
      throw new Error('should not happen?!');
    }

    const savedEntities = documents.map(toEntity);
    return savedEntities;
  }

  async load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean = true): Promise<U | undefined> {
    const filter: Mongo.FilterQuery<MongoDocument<T>> = {
      _id: id
    };

    return this.loadByFilter(filter, throwIfNotFound);
  }

  async loadByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>, throwIfNotFound?: true): Promise<U>;
  async loadByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>, throwIfNotFound: boolean): Promise<U | undefined>;
  async loadByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>, throwIfNotFound: boolean = true): Promise<U | undefined> {
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

  async *loadManyById<U extends T = T>(ids: string[]): AsyncIterableIterator<U> {
    const filter: Mongo.FilterQuery<MongoDocument<T>> = {
      _id: { $in: ids }
    };

    yield* this.loadManyByFilter(filter);
  }

  async *loadManyByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter);

    for await (const document of (cursor as AsyncIterable<MongoDocument<U>>)) {
      const entity = toEntity(document);
      yield entity;
    }
  }

  async countByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>): Promise<number> {
    return this.collection.countDocuments(filter);
  }

  async hasByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>): Promise<boolean> {
    const count = await this.countByFilter(filter);
    return count > 0;
  }

  async has(id: string): Promise<boolean> {
    const filter = { _id: id };
    return this.hasByFilter(filter);
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const filter: Mongo.FilterQuery<MongoDocument<T>> = {
      _id: { $in: ids }
    };

    const result = await this.collection.distinct('_id', filter) as string[];
    return result;
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

function toInsertOneOperation<T extends Entity>(document: MongoDocument<T>) {
  const operation = {
    insertOne: {
      document
    }
  };

  return operation;
}

function toReplaceOneOperation<T extends Entity>(document: MongoDocument<T>, upsert: boolean) {
  const filter: Mongo.FilterQuery<MongoDocument<T>> = {
    _id: document._id
  };

  const operation = {
    replaceOne: {
      filter,
      replacement: document,
      upsert
    }
  };

  return operation;
}
