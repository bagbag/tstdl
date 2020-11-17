import { currentTimestamp } from '@tstdl/base/utils';
import type { Entity, MaybeNewEntity } from '@tstdl/database';
import type { BulkWriteOpResultObject } from 'mongodb';
import type { ReplaceOptions, UpdateOptions } from './base-repository';
import { deleteManyOperation, deleteOneOperation, insertOneOperation, replaceOneOperation, updateManyOperation, updateOneOperation } from './base-repository';
import { mongoDocumentFromMaybeNewEntity, toEntity, toMongoDocument } from './model';
import type { BulkWriteOperation, Collection, FilterQuery, UpdateQuery } from './types';

export type BulkResult = {
  insertedCount: number,
  matchedCount: number,
  modifiedCount: number,
  deletedCount: number,
  upsertedCount: number,
  raw: BulkWriteOpResultObject
};

export class MongoBulk<T extends Entity> {
  private readonly collection: Collection<T>;
  private readonly operations: BulkWriteOperation<any>[];

  private executed: boolean;

  constructor(collection: Collection<T>) {
    this.collection = collection;

    this.operations = [];
    this.executed = false;
  }

  async execute(ordered: boolean = false): Promise<BulkResult> {
    if (this.executed) {
      throw new Error('already executed');
    }

    this.executed = true;

    if (this.operations.length == 0) {
      throw new Error('no operations specified');
    }

    const result = await this.collection.bulkWrite(this.operations, { ordered });

    return {
      insertedCount: result.insertedCount ?? 0,
      matchedCount: result.matchedCount ?? 0,
      modifiedCount: result.modifiedCount ?? 0,
      deletedCount: result.deletedCount ?? 0,
      upsertedCount: result.upsertedCount ?? 0,
      raw: result
    };
  }

  insert<U extends T>(entity: MaybeNewEntity<U>): U {
    const document = mongoDocumentFromMaybeNewEntity(entity);
    const operation = insertOneOperation(document);
    this.operations.push(operation);

    return toEntity(document);
  }

  insertMany<U extends T>(entities: MaybeNewEntity<U>[]): U[] {
    const documents = entities.map(mongoDocumentFromMaybeNewEntity);
    const operations = documents.map(insertOneOperation);
    this.operations.push(...operations);

    return documents.map(toEntity);
  }

  update<U extends T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: UpdateOptions): MongoBulk<T> {
    const operation = updateOneOperation(filter, update, options);
    this.operations.push(operation);

    return this;
  }

  updateMany<U extends T>(filter: FilterQuery<U>, update: UpdateQuery<U>, options?: UpdateOptions): MongoBulk<T> {
    const operation = updateManyOperation(filter, update, options);
    this.operations.push(operation);

    return this;
  }

  replace<U extends T>(entity: U, includeDeleted: boolean, options?: ReplaceOptions): MongoBulk<T> {
    const document = toMongoDocument(entity);
    const operation = replaceOneOperation(document, includeDeleted, currentTimestamp(), options);
    this.operations.push(operation);

    return this;
  }

  replaceMany<U extends T>(entities: U[], includeDeleted: boolean, options?: ReplaceOptions): MongoBulk<T> {
    const timestamp = currentTimestamp();
    const documents = entities.map(toMongoDocument);
    const operations = documents.map((document) => replaceOneOperation(document, includeDeleted, timestamp, options));
    this.operations.push(...operations);

    return this;
  }

  delete<U extends T>(entity: U): MongoBulk<T> {
    const filter: FilterQuery<Entity> = { _id: entity.id };
    return this.deleteByFilter(filter);
  }

  deleteMany<U extends T>(entities: U[]): MongoBulk<T> {
    const ids = entities.map((entity) => entity.id);
    const filter: FilterQuery<Entity> = { _id: { $in: ids } };
    return this.deleteManyByFilter(filter);
  }

  deleteByFilter<U extends T>(filter: FilterQuery<U>): MongoBulk<T> {
    const operation = deleteOneOperation(filter);
    this.operations.push(operation);

    return this;
  }

  deleteManyByFilter<U extends T>(filter: FilterQuery<U>): MongoBulk<T> {
    const operation = deleteManyOperation(filter);
    this.operations.push(operation);

    return this;
  }
}
