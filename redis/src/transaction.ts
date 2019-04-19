import { DeferredPromise } from '@common-ts/base/promise';
import { PropertiesOfType } from '@common-ts/base/types';
import { Pipeline, Redis } from 'ioredis';

type SupportedCommands =
  | 'hget'
  | 'hexists'
  | 'hdel'
  | 'hgetall'
  | 'hincrby'
  | 'hincrbyfloat'
  | 'hkeys'
  | 'hlen'
  | 'hmget'
  | 'hmset'
  | 'hset'
  | 'hvals'
  | 'hscan';

export class RedisTransaction implements Pick<Redis, SupportedCommands> {
  private readonly multi: Pipeline;
  private readonly promises: DeferredPromise<any>[];

  // tslint:disable: typedef
  hget = this.wrap('hget');
  hexists = this.wrap('hexists');
  hdel = this.wrap('hdel');
  hgetall = this.wrap('hgetall');
  hincrby = this.wrap('hincrby');
  hincrbyfloat = this.wrap('hincrbyfloat');
  hkeys = this.wrap('hkeys');
  hlen = this.wrap('hlen');
  hmget = this.wrap('hmget');
  hmset = this.wrap('hmset');
  hset = this.wrap('hset');
  hvals = this.wrap('hvals');
  hscan = this.wrap('hscan');
  // tslint:enable: typedef

  constructor(redis: Redis) {
    this.multi = redis.multi();
    this.promises = [];
  }

  wrap<F extends PropertiesOfType<Pipeline, Function>, Args extends Parameters<Pipeline[F]>>(func: F): (...args: Args) => ReturnType<Redis[F]> {
    return ((...args: Args) => {
      const promise = this.register();
      const callback = args[args.length - 1];

      const lastParameterIsCallback = typeof callback == 'function';

      if (lastParameterIsCallback) {
        promise.then((reply) => callback(null, reply)).catch((error) => callback(error, null));
      }

      const commandArguments =
        lastParameterIsCallback
          ? args.slice(0, -1)
          : args;

      (this.multi as any)[func](...commandArguments);

      return promise;
    }) as (...args: Args) => ReturnType<Redis[F]>;
  }

  async exec(): Promise<[Error | null, any][]> {
    const replies = await this.multi.exec() as [Error | null, any][];

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

  // tslint:disable-next-line: promise-function-async
  private register<T>(): Promise<T> {
    const deferredPromise = new DeferredPromise<T>();
    this.promises.push(deferredPromise);

    return deferredPromise;
  }
}
