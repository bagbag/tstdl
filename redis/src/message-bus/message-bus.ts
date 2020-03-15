import { MessageBus } from '@tstdl/base/message-bus';
import { serialize } from '@tstdl/base/serializer';
import { Observable } from 'rxjs';
import { TypedRedis } from '../typed-redis';

export class RedisMessageBus<T> implements MessageBus<T> {
  private readonly redis: TypedRedis;
  private readonly channel: string;
  private readonly messageObservable: Observable<T>;

  get message$(): Observable<T> {
    return this.messageObservable;
  }

  constructor(redis: TypedRedis, channel: string, message$: Observable<T>) {
    this.redis = redis;
    this.channel = channel;
    this.messageObservable = message$;
  }

  async publish(message: T): Promise<void> {
    const serialized = serialize(message);
    await this.redis.publish(this.channel, serialized);
  }
}
