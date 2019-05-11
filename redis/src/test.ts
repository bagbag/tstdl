import * as Redis from 'ioredis';
import { RedisTransactionWrapper } from './transaction-wrapper';

const redis = new Redis();

redis.set('asd', 5);
redis.set('asd2', 5);
redis.set('asd3', 5);
redis.set('asd4', 5);


redis.scan(0, 'COUNT', 1).then(console.log)
