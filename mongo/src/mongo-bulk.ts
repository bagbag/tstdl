import type { Entity, EntityWithPartialId } from '@tstdl/database';
import type { ReplaceOptions, UpdateOptions } from './base-repository';
import { deleteManyOperation, deleteOneOperation, insertOneOperation, replaceOneOperation, updateManyOperation, updateOneOperation } from './base-repository';
import { toMongoDocument, toMongoDocumentWithId } from './model';
import type { BulkWriteOperation, Collection, FilterQuery, UpdateQuery } from './types';

export type BulkResult = {
  insertedCount: number,
  matchedCount: number,
  modifiedCount: number,
  deletedCount: number,
  upsertedCount: number
};

export class MongoBulk<T extends Entity> {
  private readonly collection: Collection<T>;
  private readonly operations: BulkWriteOperation<any>[];

  private executed: boolean;

  constructor(collection: Collection<T>) {
    this.collection = collection;

    this.executed = false;
  }

  async execute(ordered: boolean = false): Promise<BulkResult> {
    if (this.executed) {
      throw new Error('already executed');
    }

    this.executed = true;

    if (this.operations.length == 0) {
      return {
        insertedCount: 0,
        matchedCount: 0,
        modifiedCount: 0,
        deletedCount: 0,
        upsertedCount: 0
      };
    }

    const { insertedCount, matchedCount, modifiedCount, deletedCount, upsertedCount } = await this.collection.bulkWrite(this.operations, { ordered });

    return {
      insertedCount: insertedCount ?? 0,
      matchedCount: matchedCount ?? 0,
      modifiedCount: modifiedCount ?? 0,
      deletedCount: deletedCount ?? 0,
      upsertedCount: upsertedCount ?? 0
    };
  }

  insert<U extends T>(entity: EntityWithPartialId<U>): MongoBulk<T> {
    const document = toMongoDocumentWithId(entity);
    const operation = insertOneOperation(document);
    this.operations.push(operation);

    return this;
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

  replace<U extends T>(entity: U, options?: ReplaceOptions): MongoBulk<T> {
    const document = toMongoDocument(entity);
    const operation = replaceOneOperation(document, options);
    this.operations.push(operation);

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
