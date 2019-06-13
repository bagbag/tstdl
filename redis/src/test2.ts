import '@common-ts/base/global-this';
import { currentTimestamp } from '@common-ts/base/utils';
import * as Redis from 'ioredis';
import { RedisMessageBus } from './message-bus/message-bus';
import { TypedRedis } from './typed-redis';

const redisClient = new Redis({ lazyConnect: false });
const redisClient2 = new Redis({ lazyConnect: false });

redisClient.on('ready', () => {
  redisClient2.on('ready', () => {

    const redis = new TypedRedis(redisClient);
    const redis2 = new TypedRedis(redisClient2);

    const bus = new RedisMessageBus(redis, redis2, 'testchannel');

    setTimeout(() => {
      bus.publish({ 'yo': currentTimestamp() });
    }, 1000);

    bus.message$.subscribe(console.log);

  });
});
