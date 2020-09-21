import type { Logger } from '@tstdl/base/logger';
import { now } from '@tstdl/base/utils';
import type { EntityRepository } from '@tstdl/database';
import { MongoError } from 'mongodb';
import { MongoEntityRepository, noopTransformer } from '../entity-repository';
import { getNewDocumentId } from '../id';
import type { Collection, FilterQuery, TypedIndexSpecification } from '../types';
import type { MongoLockEntity } from './model';

const indexes: TypedIndexSpecification<MongoLockEntity>[] = [
  { key: { ressource: 1 }, unique: true },
  { key: { expire: 1 }, expireAfterSeconds: 1 }
];

export class MongoLockRepository extends MongoEntityRepository<MongoLockEntity> implements EntityRepository<MongoLockEntity> {
  constructor(collection: Collection<MongoLockEntity>, logger: Logger) {
    super(collection, noopTransformer, { logger, indexes });
  }

  async tryInsertOrRefresh(ressource: string, key: string, newExpirationDate: Date): Promise<false | Date> {
    const filter: FilterQuery<MongoLockEntity> = {
      $and: [
        { ressource },
        {
          $or: [
            { key },
            { expire: { $lte: now() } }
          ]
        }
      ]
    };

    try {
      const { upsertedCount, modifiedCount } = await this.baseRepository.collection.updateOne(filter, { $set: { expire: newExpirationDate }, $setOnInsert: { _id: getNewDocumentId(), key } }, { upsert: true });
      return (upsertedCount > 0 || modifiedCount > 0) ? newExpirationDate : false;
    }
    catch (error: unknown) {
      if (error instanceof MongoError && error.code == 11000) {
        return false;
      }

      throw error;
    }
  }

  async exists(ressource: string): Promise<boolean> {
    return this.baseRepository.hasByFilter({ ressource, expire: { $gt: now() } });
  }

  async tryUpdateExpiration(ressource: string, key: string, expirationDate: Date): Promise<false | Date> {
    const filter: FilterQuery<MongoLockEntity> = { ressource, key };
    const result = await this.baseRepository.update(filter, { $set: { expire: expirationDate } });
    return result.modifiedCount > 0 ? expirationDate : false;
  }

  async deleteByRessource(ressource: string, key: string): Promise<boolean> {
    return this.baseRepository.deleteByFilter({ ressource, key });
  }
}
