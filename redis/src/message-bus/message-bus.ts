import { MessageBus } from '@common-ts/base/message-bus';
import { Serializer } from '@common-ts/base/serializer';
import { from, Observable } from 'rxjs';
import { map, share, switchMapTo, finalize } from 'rxjs/operators';
import { TypedRedis } from '../typed-redis';

export class RedisMessageBus<T> implements MessageBus<T> {
  private readonly redis: TypedRedis;
  private readonly subscriberRedis: TypedRedis;
  private readonly channel: string;
  private readonly messageObservable: Observable<T>;

  get message$(): Observable<T> {
    return this.messageObservable;
  }

  constructor(redis: TypedRedis, subscriberRedis: TypedRedis, channel: string) {
    this.redis = redis;
    this.subscriberRedis = subscriberRedis;
    this.channel = channel;

    const subscribePromise = this.subscriberRedis.subscribe(this.channel);

    this.messageObservable = from(subscribePromise).pipe(
      switchMapTo(this.subscriberRedis.message$),
      map(({ message }) => Serializer.deserialize(message) as T),
      share()
    );
  }

  async publish(message: T): Promise<void> {
    const serialized = Serializer.serialize(message);
    await this.redis.publish(this.channel, serialized);
  }
}
