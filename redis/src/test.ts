import '@common-ts/base/global-this';
import { noopLogger } from '@common-ts/base/logger/noop';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import * as Redis from 'ioredis';
import { RedisLockProvider } from './lock';
import { RedisQueue } from './queue/queue';
import { TypedRedis } from './typed-redis';

const redisClient = new Redis({ lazyConnect: false });
redisClient.on('ready', () => {
  const redis = new TypedRedis(redisClient);
  const lockProvider = new RedisLockProvider(redisClient, noopLogger);
  const distributedLoopProvider = new DistributedLoopProvider(lockProvider);

  const queue = new RedisQueue<number>(redis, lockProvider, distributedLoopProvider, 'test', 5000, 3, noopLogger);

  let counter = 0;
  setInterval(() => queue.enqueue(++counter), 1000);

// tslint:disable-next-line: no-floating-promises
  (async () => {
    const consumer = queue.getBatchConsumer(20, new CancellationToken());

    for await (const item of consumer) {
      console.log(item);
    }
  })();
});
