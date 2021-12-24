import type { Entity, UpdateOptions } from '#/database';
import type { MongoDocument } from './model/document';
import type { ReplaceOptions } from './mongo-base.repository';
import type { DeleteManyOperation, DeleteOneOperation, Filter, InsertOneOperation, ReplaceOneOperation, UpdateFilter, UpdateManyOperation, UpdateOneOperation } from './types';

export function insertOneOperation<T extends Entity>(document: MongoDocument<T>): InsertOneOperation<T> {
  const operation: InsertOneOperation<T> = {
    insertOne: {
      document: document as any
    }
  };

  return operation;
}

export function replaceOneOperation<T extends Entity>(filter: Filter<T>, replacement: MongoDocument<T>, options: ReplaceOptions = {}): ReplaceOneOperation<T> {
  const operation: ReplaceOneOperation<T> = {
    replaceOne: {
      filter,
      replacement,
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateOneOperation<T extends Entity>(filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): UpdateOneOperation<T> {
  const operation: UpdateOneOperation<T> = {
    updateOne: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function updateManyOperation<T extends Entity>(filter: Filter<T>, update: UpdateFilter<T>, options: UpdateOptions = {}): UpdateManyOperation<T> {
  const operation: UpdateManyOperation<T> = {
    updateMany: {
      filter,
      update,
      upsert: options.upsert
    }
  };

  return operation;
}

export function deleteOneOperation<T extends Entity>(filter: Filter<T>): DeleteOneOperation<T> {
  const operation: DeleteOneOperation<T> = {
    deleteOne: {
      filter
    }
  };

  return operation;
}

export function deleteManyOperation<T extends Entity>(filter: Filter<T>): DeleteManyOperation<T> {
  const operation: DeleteManyOperation<T> = {
    deleteMany: {
      filter
    }
  };

  return operation;
}
