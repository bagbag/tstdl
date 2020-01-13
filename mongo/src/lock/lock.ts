import { Lock, LockController, LockedFunction } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { cancelableTimeout, CancellationToken, currentTimestamp, getRandomString, now, Timer, timeout } from '@tstdl/base/utils';
import { MongoBaseRepository } from '../base-repository';
import { getNewDocumentId } from '../id';
import { FilterQuery } from '../types';
import { LockEntity } from './model';
import { MongoError } from 'mongodb';

const EXPIRE_TIME = 30000;

export class MongoLock implements Lock {
  private readonly lockRepository: MongoBaseRepository<LockEntity>;
  private readonly logger: Logger;
  private readonly ressource: string;

  constructor(lockRepository: MongoBaseRepository<LockEntity>, logger: Logger, ressource: string) {
    this.lockRepository = lockRepository;
    this.logger = logger;
    this.ressource = ressource;
  }

  async acquire(timeout: number): Promise<false | LockController>;
  async acquire(timeout: number, func: LockedFunction): Promise<boolean>;
  async acquire(_timeout: number, func?: LockedFunction | undefined): Promise<boolean | LockController> {
    const key = getRandomString(15);
    const timeoutDuration = Math.max(50, Math.min(1000, _timeout / 10));

    let result: boolean | Date = false;

    const timer = new Timer(true);
    while (result == false && timer.milliseconds < _timeout) {
      result = await this.tryAcquireOrRefresh(this.ressource, key);

      if (result == false) {
        await timeout(timeoutDuration);
      }
    }

    if (result == false) {
      return false;
    }

    let expiration = result;
    const releaseToken = new CancellationToken();

    const controller: LockController = {
      get lost(): boolean {
        return currentTimestamp() >= expiration.valueOf();
      },
      release: async () => {
        releaseToken.set();
        await this.release(this.ressource, key);
      }
    };

    // tslint:disable-next-line: no-floating-promises
    (async () => {
      await cancelableTimeout(5000, releaseToken);

      while (!releaseToken.isSet && !controller.lost) {
        try {
          const result = await this.tryRefresh(this.ressource, key);

          if (result == false) {
            expiration = (result == false) ? new Date(0) : result;
            return;
          }
          else {
            expiration = result;
          }
        }
        catch (error) {
          this.logger.error(error as Error);
        }
        finally {
          await cancelableTimeout(5000, releaseToken);
        }
      }
    })();

    if (func != undefined) {
      try {
        await func(controller);
        return true;
      }
      finally {
        await controller.release();
      }
    }

    return controller;
  }

  async exists(): Promise<boolean> {
    return this.lockRepository.hasByFilter({ ressource: this.ressource, expire: { $gt: now() } });
  }

  private async tryAcquireOrRefresh(ressource: string, key: string): Promise<false | Date> {
    const expire = getExpireDate();

    const filter: FilterQuery<LockEntity> = {
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
      const { upsertedCount, modifiedCount } = await this.lockRepository.update(filter, { $set: { expire }, $setOnInsert: { _id: getNewDocumentId(), key } }, true);
      return (upsertedCount > 0 || modifiedCount > 0) ? expire : false;
    }
    catch (error) {
      if (error instanceof MongoError && error.code == 11000) {
        return false;
      }

      throw error;
    }
  }

  private async tryRefresh(ressource: string, key: string): Promise<false | Date> {
    const expire = getExpireDate();

    const filter = { ressource, key };
    const result = await this.lockRepository.update(filter, { $set: { expire } });
    return result.modifiedCount > 0 ? expire : false;
  }

  private async release(ressource: string, key: string): Promise<void> {
    await this.lockRepository.deleteByFilter({ ressource, key });
  }
}

function getExpireDate(): Date {
  return new Date(currentTimestamp() + EXPIRE_TIME);
}
