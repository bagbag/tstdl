import { injectable } from '#/container';
import { getNewId } from '#/database';
import { MongoEntityRepository, noopTransformer } from '#/database/mongo/mongo-entity-repository';
import type { Filter, TypedIndexDescription } from '#/database/mongo/types';
import { Collection } from '#/database/mongo/types';
import { Logger } from '#/logger';
import { now } from '#/utils/date-time';
import { MongoError } from 'mongodb';
import type { MongoLockEntity } from './model';

const indexes: TypedIndexDescription<MongoLockEntity>[] = [
  { key: { resource: 1 }, unique: true },
  { key: { expiration: 1 }, expireAfterSeconds: 1 }
];

@injectable()
export class MongoLockRepository extends MongoEntityRepository<MongoLockEntity> {
  constructor(collection: Collection<MongoLockEntity>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async tryInsertOrRefresh(resource: string, key: string, newExpirationDate: Date): Promise<false | Date> {
    const filter: Filter<MongoLockEntity> = {
      $and: [
        { resource },
        {
          $or: [
            { key },
            { expiration: { $lte: now() } }
          ]
        }
      ]
    };

    try {
      const { upsertedCount, modifiedCount } = await this.baseRepository.collection.updateOne(filter, { $set: { expiration: newExpirationDate }, $setOnInsert: { _id: getNewId(), key } }, { upsert: true });
      return (upsertedCount > 0 || modifiedCount > 0) ? newExpirationDate : false;
    }
    catch (error: unknown) {
      if (error instanceof MongoError && error.code == 11000) {
        return false;
      }

      throw error;
    }
  }

  async exists(resource: string): Promise<boolean> {
    return this.baseRepository.hasByFilter({ resource, expiration: { $gt: now() } });
  }

  async tryUpdateExpiration(resource: string, key: string, expirationDate: Date): Promise<false | Date> {
    const filter: Filter<MongoLockEntity> = { resource, key };
    const result = await this.baseRepository.update(filter, { $set: { expiration: expirationDate } });
    return result.modifiedCount > 0 ? expirationDate : false;
  }

  async deleteByResource(resource: string, key: string): Promise<boolean> {
    return this.baseRepository.deleteByFilter({ resource, key });
  }
}
