import { Lock, LockController, LockedFunction } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { DeferredPromise } from '@tstdl/base/promise';
import { cancelableTimeout, currentTimestamp, getRandomString, immediate, timeout, Timer } from '@tstdl/base/utils';
import { lockAcquireLuaScript, lockOwnedLuaScript, lockRefreshLuaScript, lockReleaseLuaScript } from '../lua';
import { TypedRedis } from '../typed-redis';
import { AcquireResult } from './acquire-result';

const LOCK_DURATION = 10000;
const RETRY_DELAY = 50;

export class RedisLock implements Lock {
  private readonly redis: TypedRedis;
  private readonly key: string;
  private readonly logger: Logger;
  private readonly lockDuration: number;
  private readonly retryDelay: number;

  constructor(redis: TypedRedis, key: string, logger: Logger, { lockDuration = LOCK_DURATION, retryDelay = RETRY_DELAY }: { lockDuration?: number, retryDelay?: number } = {}) {
    this.redis = redis;
    this.key = key;
    this.logger = logger;
    this.lockDuration = lockDuration;
    this.retryDelay = retryDelay;
  }

  /**
   * @param func Function to run after the lock is acquired. Lock is automatically released after the function has returned.
   * @returns False if acquiring the lock has failed, or a LockController otherwise.
   */
  async acquire(timeout: number, func?: LockedFunction): Promise<LockController | false> {
    const id = getRandomString(15);
    const newExpireTimestamp = await this._acquire(id, timeout);

    if (newExpireTimestamp == -1) {
      return false;
    }

    let stop = false;
    let expireTimestamp = newExpireTimestamp;
    const stopPromise = new DeferredPromise();
    const stoppedPromise = new DeferredPromise();

    const controller: LockController = {
      get lost(): boolean {
        return (expireTimestamp < currentTimestamp());
      },
      release: async () => {
        if (stop) {
          await stoppedPromise;
          return;
        }

        stop = true;
        stopPromise.resolve();
        await stoppedPromise;
        await this.release(id);
        expireTimestamp = -1;
      }
    };

    // tslint:disable-next-line: no-floating-promises
    (async () => {
      while (!stop && !controller.lost) {
        try {
          const newExpireTimestamp = this.getNewExpireTimestamp();
          const success = await this.refresh(id, newExpireTimestamp);

          if (success) {
            expireTimestamp = newExpireTimestamp;
          }
        }
        catch (error) {
          this.logger.error(error); // tslint:disable-line: no-unsafe-any
        }

        const millisecondsLeft = (expireTimestamp - currentTimestamp());
        const delay = Math.max(millisecondsLeft * 0.5, this.retryDelay);
        await cancelableTimeout(delay, stopPromise);
      }

      stoppedPromise.resolve();
    })()
      .catch((error) => this.logger.error(error)); // tslint:disable-line: no-unsafe-any

    if (func != undefined) {
      try {
        await func(controller);
        await immediate();
      }
      finally {
        await controller.release();
      }
    }

    return controller;
  }

  async exists(): Promise<boolean> {
    const result = await this.redis.exists(this.key);
    return result == 1;
  }

  async getExpireTimestamp(id: string): Promise<number> {
    const expireTimestamp = await this.redis.evaluate<number>(lockOwnedLuaScript, [this.key], [id]);
    return expireTimestamp;
  }

  private async _acquire(id: string, acquireTimeout: number): Promise<number> {
    const timer = new Timer(true);
    let expireTimestamp = -1;

    do {
      const newExpireTimestamp = this.getNewExpireTimestamp();
      const result = await this.tryAcquire(id, newExpireTimestamp);

      if ((result == AcquireResult.Acquired) || (result == AcquireResult.Owned)) {
        expireTimestamp = newExpireTimestamp;
      }

      if ((expireTimestamp == -1) && (timer.milliseconds < acquireTimeout)) {
        await timeout(this.retryDelay);
      }
    }
    while ((expireTimestamp == -1) && (timer.milliseconds < acquireTimeout));

    return expireTimestamp;
  }

  private async release(id: string, force: boolean = false): Promise<boolean> {
    const result = await this.redis.evaluate<number>(lockReleaseLuaScript, [this.key], [id, force ? '1' : '0']);
    const success = (result == 1);

    return success;
  }

  private async tryAcquire(id: string, expireTimestamp: number): Promise<AcquireResult> {
    const result = await this.redis.evaluate<AcquireResult>(lockAcquireLuaScript, [this.key], [id, expireTimestamp.toString()]);
    return result;
  }

  private async refresh(id: string, expireTimestamp: number): Promise<boolean> {
    const result = await this.redis.evaluate<number>(lockRefreshLuaScript, [this.key], [id, expireTimestamp.toString()]);
    const success = (result == 1);

    return success;
  }

  private getNewExpireTimestamp(): number {
    return currentTimestamp() + this.lockDuration;
  }
}
