import { LockProvider } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { TypedRedis } from '../typed-redis';
import { RedisLock } from './lock';

export class RedisLockProvider implements LockProvider {
  private readonly redis: TypedRedis;
  private readonly logger: Logger;

  constructor(redis: TypedRedis, logger: Logger) {
    this.redis = redis;
    this.logger = logger;
  }

  get(key: string): RedisLock {
    const lockKey = `lock:${key}`;

    const lock = new RedisLock(this.redis, lockKey, this.logger);
    return lock;
  }
}
