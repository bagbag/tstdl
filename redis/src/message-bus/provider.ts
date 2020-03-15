import { Logger } from '@tstdl/base/logger';
import { MessageBus, MessageBusProvider } from '@tstdl/base/message-bus';
import { teardown } from '@tstdl/base/rxjs';
import { deserialize } from '@tstdl/base/serializer';
import { defer, from, Observable } from 'rxjs';
import { filter, map, share, switchMap } from 'rxjs/operators';
import { TypedRedis } from '../typed-redis';
import { RedisMessageBus } from './message-bus';

export class RedisMessageBusProvider implements MessageBusProvider {
  private readonly redis: TypedRedis;
  private readonly subscriberRedis: TypedRedis;
  private readonly messageObservables: Map<string, Observable<any>>;
  private readonly logger: Logger;

  constructor(redis: TypedRedis, subscriberRedis: TypedRedis, logger: Logger) {
    this.redis = redis;
    this.subscriberRedis = subscriberRedis;
    this.logger = logger;

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
        map(({ message }) => deserialize<T>(message)),
        teardown(async () => this.subscriberRedis.unsubscribe(channel).catch((error) => this.logger.error(error))),
        share()
      );

    return observable;
  }
}
