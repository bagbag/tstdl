import * as Redis from 'ioredis';
import { RedisTransaction } from './transaction';

const redis = new Redis();

const transaction = new RedisTransaction(redis);

const replies = Promise.all([
  redis.zadd('test2', 1 as any as string, 'asd'),
  redis.zscore('test2', 'asd')
]);

replies.then(console.log).catch(console.error);

transaction.exec().then(console.log).catch(console.error).then(() => redis.disconnect());

