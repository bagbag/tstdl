import * as Redis from 'ioredis';
import { TypedRedis } from './typed-redis';
import { dequeueLuaScript } from './lua';
import { benchmarkAsync, timedBenchmarkAsync, Timer } from '@common-ts/base/utils';
import { RedisQueue } from './queue/queue';
import { RedisLockProvider } from './lock';

const redisClient = new Redis({ lazyConnect: false });
redisClient.on('ready', () => {
  const redis = new TypedRedis(redisClient);
  const lockProvider = new RedisLockProvider(redisClient, null);

  (async () => {
    new RedisQueue(redis, )
  })();
});
