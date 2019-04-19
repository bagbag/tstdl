import * as Redis from 'ioredis';
import { RedisTransaction } from './transaction';

const redis = new Redis();

const transaction = new RedisTransaction(redis);

const replies = Promise.all([
  transaction.hmset('test', ['field', 'value']),
  transaction.hmset('test', ['field2', 'value2']),
  transaction.hmget('test', 'field', 'field2')
]);

replies.then(console.log).catch(console.error);

transaction.exec().then(console.log).catch(console.error);
