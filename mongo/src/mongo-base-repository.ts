import { SyncEnumerable } from '@common-ts/base/enumerable';
import * as Mongo from 'mongodb';
import { Entity, EntityWithPartialId } from './entity';
import { MongoDocument, toEntity, toMongoDocumentWithPartialId } from './mongo-document';
import { IdsMap, objectIdOrStringToString, stringToObjectIdOrString } from './utils';

export type FilterQuery<T extends Entity> = Mongo.FilterQuery<MongoDocument<T>>;

export class MongoBaseRepository<T extends Entity> {
  private readonly collection: Mongo.Collection<MongoDocument<T>>;

  constructor(collection: Mongo.Collection<MongoDocument<T>>) {
    this.collection = collection;
  }

  async insert<U extends T>(entity: EntityWithPartialId<U>): Promise<U> {
    const document = toMongoDocumentWithPartialId(entity);
    const result = await this.collection.insertOne(document as MongoDocument<U>);

    const entityCopy = (entity.id != undefined)
      ? { ...(entity as U) }
      : { ...(entity as U), id: objectIdOrStringToString(result.insertedId) };

    return entityCopy;
  }

  async replace<U extends T>(entity: EntityWithPartialId<U>, upsert: boolean): Promise<U> {
    const savedEntities = await this.replaceMany([entity], upsert);
    return SyncEnumerable.from(savedEntities).single();
  }

  async insertMany<U extends T>(entities: EntityWithPartialId<U>[]): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const operations = entities.map(toInsertOneOperation);
    const bulkWriteResult = await this.collection.bulkWrite(operations);
    const insertedIds = bulkWriteResult.insertedIds as IdsMap;
    const savedEntities = entities.map((entity, index) => {
      const entityCopy = { ...entity };

      const hasInsertedId = insertedIds.hasOwnProperty(index);

      if (hasInsertedId) {
        entityCopy.id = objectIdOrStringToString(insertedIds[index] as any as Mongo.ObjectId);
      }

      return entityCopy as U;
    });

    return savedEntities;
  }

  async replaceMany<U extends T>(entities: EntityWithPartialId<U>[], upsert: boolean): Promise<U[]> {
    if (entities.length == 0) {
      return [];
    }

    const operations = entities.map((entity) => toReplaceOneOperation(entity, upsert));
    const bulkWriteResult = await this.collection.bulkWrite(operations);
    const upsertedIds = bulkWriteResult.upsertedIds as IdsMap;
    const savedEntities = entities.map((entity, index) => {
      const entityCopy = { ...entity };

      const hasUpsertedId = upsertedIds.hasOwnProperty(index);
      if (hasUpsertedId) {
        entityCopy.id = objectIdOrStringToString(upsertedIds[index]._id);
      }

      return entityCopy as U;
    });

    return savedEntities;
  }

  async load<U extends T = T>(id: string, throwIfNotFound?: true): Promise<U>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean): Promise<U | undefined>;
  async load<U extends T = T>(id: string, throwIfNotFound: boolean = true): Promise<U | undefined> {
    const filter = {
      _id: stringToObjectIdOrString(id)
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
    const normalizedIds = ids.map(stringToObjectIdOrString);

    const filter: Mongo.FilterQuery<MongoDocument<T>> = {
      _id: { $in: normalizedIds }
    };

    yield* this.loadManyByFilter(filter);
  }

  async *loadManyByFilter<U extends T = T>(filter: Mongo.FilterQuery<MongoDocument<U>>): AsyncIterableIterator<U> {
    const cursor = this.collection.find<MongoDocument<U>>(filter);

    while (true) {
      const document = await cursor.next();

      if (document == undefined) {
        break;
      }

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
    const filter = { _id: stringToObjectIdOrString(id) };
    return this.hasByFilter(filter);
  }

  async hasMany(ids: string[]): Promise<string[]> {
    const normalizedIds = ids.map(stringToObjectIdOrString);

    const filter: Mongo.FilterQuery<MongoDocument<T>> = {
      _id: { $in: normalizedIds }
    };

    const result = await this.collection.distinct('_id', filter) as string[];
    return result;
  }

  async drop(): Promise<void> {
    await this.collection.drop();
  }
}

function toInsertOneOperation<T extends Entity>(entity: EntityWithPartialId<T>): object {
  const document = toMongoDocumentWithPartialId(entity);

  const operation = {
    insertOne: {
      document
    }
  };

  return operation;
}

function toReplaceOneOperation<T extends Entity>(entity: EntityWithPartialId<T>, upsert: boolean): object {
  const filter: Mongo.FilterQuery<MongoDocument<T>> = {};

  if (entity.id != undefined) {
    filter._id = entity.id;
  }

  const replacement = toMongoDocumentWithPartialId(entity);

  const operation = {
    replaceOne: {
      filter,
      replacement,
      upsert
    }
  };

  return operation;
}
