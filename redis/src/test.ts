import * as Redis from 'ioredis';
import { TypedRedis } from './typed-redis';
import { dequeueLuaScript } from './lua';
import { benchmarkAsync, timedBenchmarkAsync, Timer } from '@common-ts/base/utils';

const redis = new TypedRedis(new Redis()).transaction();

for (let i = 0; i < 1000; i++) {
  redis.scriptLoad(dequeueLuaScript);
}

(async () => {
  const result = Timer.measureAsync(() => redis.execute());
  console.log(result);
})();
