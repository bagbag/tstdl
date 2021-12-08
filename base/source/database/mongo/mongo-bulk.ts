import type { Entity, MaybeNewEntity } from '#/database';
import type { BulkWriteResult } from 'mongodb';
import { mongoDocumentFromMaybeNewEntity, toEntity, toMongoDocument } from './model';
import type { ReplaceOptions, UpdateOptions } from './mongo-base.repository';
import { deleteManyOperation, deleteOneOperation, insertOneOperation, replaceOneOperation, updateManyOperation, updateOneOperation } from './mongo-base.repository';
import type { BulkWriteOperation, Collection, Filter, UpdateFilter } from './types';

export type BulkResult = {
  insertedCount: number,
  matchedCount: number,
  modifiedCount: number,
  deletedCount: number,
  upsertedCount: number,
  raw: BulkWriteResult
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

  /**
   * execute operations
   * @param ordered whether operations must be executed in order (slower) (default: false)
   */
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
      insertedCount: result.insertedCount,
      matchedCount: result.matchedCount,
      modifiedCount: result.modifiedCount,
      deletedCount: result.deletedCount,
      upsertedCount: result.upsertedCount,
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

  update<U extends T>(filter: Filter<U>, update: UpdateFilter<U>, options?: UpdateOptions): this {
    const operation = updateOneOperation(filter, update, options);
    this.operations.push(operation);

    return this;
  }

  updateMany<U extends T>(filter: Filter<U>, update: UpdateFilter<U>, options?: UpdateOptions): this {
    const operation = updateManyOperation(filter, update, options);
    this.operations.push(operation);

    return this;
  }

  replace<U extends T>(entity: U, options?: ReplaceOptions): this {
    return this.replaceByFilter({ _id: entity.id } as Filter<U>, entity, options);
  }

  replaceMany<U extends T>(entities: U[], options?: ReplaceOptions): this {
    const documents = entities.map(toMongoDocument);
    const operations = documents.map((document) => replaceOneOperation({ _id: document._id } as Filter<U>, document, options));
    this.operations.push(...operations);

    return this;
  }

  replaceByFilter<U extends T>(filter: Filter<U>, entity: U, options?: ReplaceOptions): this {
    const document = toMongoDocument(entity);
    const operation = replaceOneOperation(filter, document, options);
    this.operations.push(operation);

    return this;
  }

  delete<U extends T>(entity: U): this {
    const filter: Filter = { _id: entity.id };
    return this.deleteByFilter(filter as Filter<U>);
  }

  deleteMany<U extends T>(entities: U[]): this {
    const ids = entities.map((entity) => entity.id);
    const filter: Filter = { _id: { $in: ids } };
    return this.deleteManyByFilter(filter as Filter<U>);
  }

  deleteByFilter<U extends T>(filter: Filter<U>): this {
    const operation = deleteOneOperation(filter);
    this.operations.push(operation);

    return this;
  }

  deleteManyByFilter<U extends T>(filter: Filter<U>): this {
    const operation = deleteManyOperation(filter);
    this.operations.push(operation);

    return this;
  }
}
