import { DeferredPromise } from '@tstdl/base/promise';
import { PropertiesOfType, StringMap } from '@tstdl/base/types';
import { Pipeline, Redis } from 'ioredis';

const redisTransactionWrapperSymbol: unique symbol = Symbol('redisTransactionWrapperSymbol');

export class RedisPipelineWrapper {
  private readonly pipeline: Pipeline;
  private readonly promises: DeferredPromise<any>[];

  readonly [redisTransactionWrapperSymbol]: undefined = undefined;


  /* eslint-disable no-invalid-this */
  /* - */
  eval = this.wrap('eval');
  evalsha = this.wrap('evalsha');
  script = this.wrap('script');
  exists = this.wrap('exists');

  /* pub/Sub */
  publish = this.wrap('publish');

  /* strings */
  get = this.wrap('set');
  set = this.wrap('set');
  getSet = this.wrap('getset');

  /* hash */
  hdel = this.wrap('hdel');
  hexists = this.wrap('hexists');
  hget = this.wrap('hget');
  hgetall = this.wrap('hgetall');
  hincrby = this.wrap('hincrby');
  hincrbyfloat = this.wrap('hincrbyfloat');
  hkeys = this.wrap('hkeys');
  hlen = this.wrap('hlen');
  hmget = this.wrap('hmget');
  hmset = this.wrap('hmset');
  hscan = this.wrap('hscan');
  hset = this.wrap('hset');
  hvals = this.wrap('hvals');

  /* sorted Set */
  bzpopmax = this.wrap('bzpopmax');
  bzpopmin = this.wrap('bzpopmin');
  zadd = this.wrap('zadd');
  zcard = this.wrap('zcard');
  zcount = this.wrap('zcount');
  zincrby = this.wrap('zincrby');
  zinterstore = this.wrap('zinterstore');
  zlexcount = this.wrap('zlexcount');
  zpopmax = this.wrap('zpopmax');
  zpopmin = this.wrap('zpopmin');
  zrange = this.wrap('zrange');
  zrangebylex = this.wrap('zrangebylex');
  zrangebyscore = this.wrap('zrangebyscore');
  zrank = this.wrap('zrank');
  zrem = this.wrap('zrem');
  zremrangebylex = this.wrap('zremrangebylex');
  zremrangebyrank = this.wrap('zremrangebyrank');
  zremrangebyscore = this.wrap('zremrangebyscore');
  zrevrange = this.wrap('zrevrange');
  zrevrangebylex = this.wrap('zrevrangebylex');
  zrevrangebyscore = this.wrap('zrevrangebyscore');
  zrevrank = this.wrap('zrevrank');
  zscan = this.wrap('zscan');
  zscore = this.wrap('zscore');
  zunionstore = this.wrap('zunionstore');

  /* list */
  lpush = this.wrap('lpush');
  rpush = this.wrap('rpush');
  /* eslint-enable no-invalid-this */


  constructor(redis: Redis, transaction: boolean) {
    this.pipeline = transaction ? redis.multi() : redis.pipeline();
    this.promises = [];
  }

  async discard(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      this.pipeline.discard((error) => {
        if (error != undefined) {
          reject(error);
        }
        else {
          resolve();
        }
      });
    });
  }

  async execute(): Promise<[Error | null, any][]> {
    const replies = await this.pipeline.exec();

    for (let i = 0; i < replies.length; i++) {
      const [error, reply] = replies[i];
      const deferredPromise = this.promises[i];

      if (error != undefined) {
        deferredPromise.reject(error);
      }
      else {
        deferredPromise.resolve(reply);
      }
    }

    return replies;
  }

  private wrap<F extends PropertiesOfType<Pipeline, Function>, Args extends Parameters<Pipeline[F]>>(func: F): Redis[F] {
    const wrappedFunction = ((...args: Args) => {
      const promise = this.register();
      const possibleCallback = args[args.length - 1];
      const lastParameterIsCallback = typeof possibleCallback == 'function';

      if (lastParameterIsCallback) {
        throw new Error('callback-style not supported, use promise-style instead');
      }

      (this.pipeline as any as StringMap<Function>)[func](...args, (error: Error) => {
        if (error != undefined) {
          promise.reject(error);
        }
      });

      return promise;
    }) as Redis[F];

    return wrappedFunction;
  }

  private register<T>(): DeferredPromise<T> {
    const deferredPromise = new DeferredPromise<T>();
    this.promises.push(deferredPromise);

    return deferredPromise;
  }
}
