import { MessageBus, MessageBusProvider } from '@common-ts/base/message-bus';
import { teardown } from '@common-ts/base/rxjs';
import { Serializer } from '@common-ts/base/serializer';
import { defer, from, Observable } from 'rxjs';
import { filter, map, share, switchMap } from 'rxjs/operators';
import { TypedRedis } from '../typed-redis';
import { RedisMessageBus } from './message-bus';

export class RedisMessageBusProvider implements MessageBusProvider {
  private readonly redis: TypedRedis;
  private readonly subscriberRedis: TypedRedis;
  private readonly messageObservables: Map<string, Observable<any>>;

  constructor(redis: TypedRedis, subscriberRedis: TypedRedis) {
    this.redis = redis;
    this.subscriberRedis = subscriberRedis;

    this.messageObservables = new Map();
  }

  get<T>(channel: string): MessageBus<T> {
    let message$ = this.messageObservables.get(channel);

    if (message$ == undefined) {
      message$ = this.getMessageObservable(channel);
      this.messageObservables.set(channel, message$);
    }

    return new RedisMessageBus(this.redis, channel, message$);
  }

  private getMessageObservable<T>(channel: string): Observable<T> {
    const observable = defer(() => from(this.subscriberRedis.subscribe(channel)))
      .pipe(
        switchMap(() => this.subscriberRedis.message$),
        filter((message) => message.channel == channel),
        map(({ message }) => Serializer.deserialize<T>(message)),
        teardown(() => this.subscriberRedis.unsubscribe(channel)),
        share()
      );

    return observable;
  }
}
