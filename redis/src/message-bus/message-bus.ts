import { MessageBus } from '@common-ts/base/message-bus';
import { Serializer } from '@common-ts/base/serializer';
import { from, Observable } from 'rxjs';
import { map, switchMapTo } from 'rxjs/operators';
import { TypedRedis } from '../typed-redis';

export class RedisMessageBus<T> implements MessageBus<T> {
  private readonly redis: TypedRedis;
  private readonly channel: string;

  constructor(redis: TypedRedis, channel: string) {
    this.redis = redis;
    this.channel = channel;
  }

  async publish(message: T): Promise<void> {
    const serialized = Serializer.serialize(message);
    await this.redis.publish(this.channel, serialized);
  }

  subscribe(): Observable<T> {
    const subscribePromise = this.redis.subscribe(this.channel);

    return from(subscribePromise).pipe(
      switchMapTo(this.redis.message$),
      map(({ message }) => Serializer.deserialize(message))
    );
  }
}
