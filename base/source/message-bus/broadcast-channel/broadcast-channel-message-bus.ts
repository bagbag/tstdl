import type { Logger } from '#/logger';
import type { Observable } from 'rxjs';
import { defer, fromEvent, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { isUndefined } from '../../utils';
import type { MessageBus } from '../message-bus';
import { MessageBusBase } from '../message-bus-base';

export class BroadcastChannelMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly channelProvider: () => BroadcastChannel;

  private _channel: BroadcastChannel | undefined;

  protected readonly _messages$: Observable<T>;

  get channel(): BroadcastChannel {
    if (isUndefined(this._channel)) {
      if (this.disposeToken.isSet) {
        throw new Error('message-bus is disposed');
      }

      this._channel = this.channelProvider();
    }

    return this._channel;
  }

  constructor(channelProvider: () => BroadcastChannel, logger: Logger) {
    super(logger);

    this.channelProvider = channelProvider;

    this._messages$ = defer(() => of(this.channel)).pipe(
      switchMap((channel) => fromEvent<MessageEvent<T>>(channel, 'message')),
      map((event) => event.data)
    );
  }

  protected _publish(message: T): void {
    this.channel.postMessage(message);
  }

  protected _disposeAsync(): void {
    this._channel?.close();
    this._channel = undefined;
  }
}
