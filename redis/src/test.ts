import '@common-ts/base/global-this';
import { noopLogger } from '@common-ts/base/logger/noop';
import { QueueProvider } from '@common-ts/base/queue';
import { createArray } from '@common-ts/base/utils';
import { CancellationToken } from '@common-ts/base/utils/cancellation-token';
import { DistributedLoopProvider } from '@common-ts/server/distributed-loop';
import * as Redis from 'ioredis';
import { RedisLockProvider } from './lock';
import { RedisQueueProvider } from './queue/provider';
import { TypedRedis } from './typed-redis';

const redisClient = new Redis({ lazyConnect: false });
redisClient.on('ready', () => {
  const redis = new TypedRedis(redisClient);
  const lockProvider = new RedisLockProvider(redisClient, noopLogger);
  const distributedLoopProvider = new DistributedLoopProvider(lockProvider);

  const queueProvider: QueueProvider = new RedisQueueProvider(redis, lockProvider, distributedLoopProvider);
  const queue = queueProvider.get('test', 5000);

  // tslint:disable: no-floating-promises

  Promise.all([
    (async () => {
      let counter = 0;
      for (let i = 0; i < 1000; i++) {
        const data = createArray(1000, (index) => (i * 1000) + index);
        await queue.enqueueMany(data);
        counter += data.length;
        console.log('enqueued ' + counter);
      }
    })(),
    (async () => {
      let counter = 0;
      for await (const batch of queue.getBatchConsumer(1000, new CancellationToken())) {
        await queue.acknowledge(batch);
        counter += batch.length;
        console.log('processed ' + counter);
      }
    })()
  ]).finally(() => { console.log('EXIT'); process.exit() })
});
