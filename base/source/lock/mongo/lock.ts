import { CancellationToken } from '#/cancellation/index.js';
import { Injectable } from '#/injector/decorators.js';
import type { AcquireResult, LockArgument, LockController, LockedFunction, UsingResult } from '#/lock/index.js';
import { Lock } from '#/lock/index.js';
import { Logger } from '#/logger/index.js';
import { Alphabet } from '#/utils/alphabet.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { getRandomString } from '#/utils/random.js';
import { Timer } from '#/utils/timer.js';
import { cancelableTimeoutUntil, timeout as utilsTimeout } from '#/utils/timing.js';
import { assertStringPass, isObject, isUndefined } from '#/utils/type-guards.js';
import { MongoLockRepository } from './mongo-lock-repository.js';
import { MongoLockProvider } from './provider.js';

const expirationTime = 10000;
const renewBuffer = expirationTime / 2;

@Injectable({
  provider: {
    useFactory: (argument, context) => {
      const arg = argument as LockArgument;
      const prefix = isObject(arg) ? assertStringPass(arg.prefix, 'invalid lock argument') : undefined;
      const resource = assertStringPass(isObject(arg) ? arg.resource : arg, 'invalid lock argument');

      const provider = context.resolve(MongoLockProvider, prefix);
      return provider.get(resource);
    }
  }
})
export class MongoLock extends Lock {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;

  constructor(lockRepository: MongoLockRepository, resource: string, logger: Logger) {
    super(resource);

    this.lockRepository = lockRepository;
    this.logger = logger;
  }

  async acquire<Throw extends boolean>(timeout: number | undefined, throwOnFail: Throw): Promise<AcquireResult<Throw>> { // eslint-disable-line max-lines-per-function, max-statements
    const key = getRandomString(15, Alphabet.LowerUpperCaseNumbers);
    const timeoutDuration = Math.max(50, Math.min(1000, (timeout ?? 0) / 10));

    let result: boolean | Date = false;

    const timer = new Timer(true);
    while ((result == false) && (isUndefined(timeout) || (timer.milliseconds < timeout))) { // eslint-disable-line no-unmodified-loop-condition
      result = await this.tryAcquireOrRefresh(this.resource, key);

      if ((result == false) && isUndefined(timeout)) {
        break;
      }

      if (result == false) {
        await utilsTimeout(timeoutDuration);
      }
    }

    if (result == false) {
      if (throwOnFail) {
        throw new Error('Failed to acquire lock.');
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
      await cancelableTimeoutUntil(expiration.valueOf() - renewBuffer, releaseToken);

      while (!releaseToken.isSet && !controller.lost) {
        try {
          const refreshResult = await this.tryRefresh(this.resource, key);
          expiration = (refreshResult == false) ? new Date(0) : refreshResult; // eslint-disable-line require-atomic-updates
        }
        catch (error: unknown) {
          this.logger.error(error as Error);
        }
        finally {
          await cancelableTimeoutUntil(Math.max(currentTimestamp() + 1000, expiration.valueOf() - renewBuffer), releaseToken);
        }
      }
    })();

    return controller as AcquireResult<Throw>;
  }

  async use<Throw extends boolean, R>(timeout: number | undefined, throwOnFail: Throw, func: LockedFunction<R>): Promise<UsingResult<Throw, R>> {
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
  return new Date(currentTimestamp() + expirationTime);
}
