import type { MessageBus } from '@tstdl/base/message-bus';
import { MessageBusBase } from '@tstdl/base/message-bus';
import { isUndefined } from '@tstdl/base/utils';
import type { Observable } from 'rxjs';
import { defer, fromEvent, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';

export class BroadcastChannelMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly channelProvider: () => BroadcastChannel;

  private _channel: BroadcastChannel | undefined;

  protected readonly _message$: Observable<T>;

  get channel(): BroadcastChannel {
    if (isUndefined(this._channel)) {
      if (this.disposeToken.isSet) {
        throw new Error('message-bus is disposed');
      }

      this._channel = this.channelProvider();
    }

    return this._channel;
  }

  constructor(channelProvider: () => BroadcastChannel) {
    super();

    this.channelProvider = channelProvider;

    this._message$ = defer(() => of(this.channel)).pipe(
      switchMap((channel) => fromEvent<MessageEvent<T>>(channel, 'message')),
      map((event) => event.data)
    );
  }

  protected async _publish(message: T): Promise<void> {
    this.channel.postMessage(message);
  }

  protected async _disposeAsync(): Promise<void> {
    this._channel?.close();
    this._channel = undefined;
  }
}
