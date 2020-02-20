import { Lock, LockController, LockedFunction } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { cancelableTimeout, CancellationToken, currentTimestamp, getRandomString, timeout, Timer } from '@tstdl/base/utils';
import { MongoLockRepository } from './mongo-lock-repository';

const EXPIRE_TIME = 30000;

export class MongoLock implements Lock {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly ressource: string;

  constructor(lockRepository: MongoLockRepository, logger: Logger, ressource: string) {
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
    while (result == false && (timer.milliseconds < _timeout || _timeout == 0)) {
      result = await this.tryAcquireOrRefresh(this.ressource, key);

      if (result == false && _timeout == 0) {
        break;
      }

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
    return this.lockRepository.exists(this.ressource);
  }

  private async tryAcquireOrRefresh(ressource: string, key: string): Promise<false | Date> {
    const expirationDate = getExpirationDate();
    return this.lockRepository.tryInsertOrRefresh(ressource, key, expirationDate);
  }

  private async tryRefresh(ressource: string, key: string): Promise<false | Date> {
    const expire = getExpirationDate();
    return this.lockRepository.tryUpdateExpiration(ressource, key, expire);
  }

  private async release(ressource: string, key: string): Promise<boolean> {
    return this.lockRepository.deleteByRessource(ressource, key);
  }
}

function getExpirationDate(): Date {
  return new Date(currentTimestamp() + EXPIRE_TIME);
}
