import type { AcquireResult, Lock, LockController, LockedFunction, UsingResult } from '@tstdl/base/lock';
import type { Logger } from '@tstdl/base/logger';
import { Alphabet, cancelableTimeout, CancellationToken, currentTimestamp, getRandomString, timeout as utilsTimeout, Timer } from '@tstdl/base/utils';
import type { MongoLockRepository } from './mongo-lock-repository';

const EXPIRATION_TIME = 30000;

export class MongoLock implements Lock {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly resource: string;

  constructor(lockRepository: MongoLockRepository, logger: Logger, resource: string) {
    this.lockRepository = lockRepository;
    this.logger = logger;
    this.resource = resource;
  }

  async acquire<Throw extends boolean>(timeout: number, throwOnFail: Throw): Promise<AcquireResult<Throw>> { // eslint-disable-line max-lines-per-function, max-statements
    const key = getRandomString(15, Alphabet.LowerUpperCaseNumbers);
    const timeoutDuration = Math.max(50, Math.min(1000, timeout / 10));

    let result: boolean | Date = false;

    const timer = new Timer(true);
    while (result == false && (timer.milliseconds < timeout || timeout == 0)) { // eslint-disable-line no-unmodified-loop-condition
      result = await this.tryAcquireOrRefresh(this.resource, key);

      if (result == false && timeout == 0) {
        break;
      }

      if (result == false) {
        await utilsTimeout(timeoutDuration);
      }
    }

    if (result == false) {
      if (throwOnFail) {
        throw new Error('failed to acquire lock');
      }

      return false as AcquireResult<Throw>;
    }

    let expiration = result;
    const releaseToken = new CancellationToken();

    const controller: LockController = {
      get lost(): boolean {
        return currentTimestamp() >= expiration.valueOf();
      },
      release: async () => {
        releaseToken.set();
        await this.release(this.resource, key);
      }
    };

    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    (async () => {
      await cancelableTimeout(5000, releaseToken);

      while (!releaseToken.isSet && !controller.lost) {
        try {
          // eslint-disable-next-line no-shadow
          const result = await this.tryRefresh(this.resource, key);
          expiration = (result == false) ? new Date(0) : result;
        }
        catch (error: unknown) {
          this.logger.error(error as Error);
        }
        finally {
          await cancelableTimeout(5000, releaseToken);
        }
      }
    })();

    return controller as AcquireResult<Throw>;
  }

  async using<Throw extends boolean, R>(timeout: number, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>> {
    const controller = await this.acquire(timeout, throwOnFail) as AcquireResult<false>;

    if (controller == false) {
      return { success: false, result: undefined } as UsingResult<Throw, R>;
    }

    try {
      const result = await func(controller);
      return { success: true, result } as UsingResult<Throw, R>;
    }
    finally {
      await controller.release();
    }
  }

  async exists(): Promise<boolean> {
    return this.lockRepository.exists(this.resource);
  }

  private async tryAcquireOrRefresh(resource: string, key: string): Promise<false | Date> {
    const expirationDate = getExpirationDate();
    return this.lockRepository.tryInsertOrRefresh(resource, key, expirationDate);
  }

  private async tryRefresh(resource: string, key: string): Promise<false | Date> {
    const expiration = getExpirationDate();
    return this.lockRepository.tryUpdateExpiration(resource, key, expiration);
  }

  private async release(resource: string, key: string): Promise<boolean> {
    return this.lockRepository.deleteByResource(resource, key);
  }
}

function getExpirationDate(): Date {
  return new Date(currentTimestamp() + EXPIRATION_TIME);
}
