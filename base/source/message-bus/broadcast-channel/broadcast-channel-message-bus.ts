import type { Logger } from '#/logger';
import type { Observable } from 'rxjs';
import { defer, fromEvent, map, of, switchMap } from 'rxjs';
import { isUndefined } from '../../utils';
import type { MessageBus } from '../message-bus';
import { MessageBusBase } from '../message-bus-base';

/** return values wrapped in Promise for polyfills which returns promises */
interface PromisifiedBroadcastChannel extends BroadcastChannel {
  close(...args: Parameters<BroadcastChannel['close']>): Promise<ReturnType<BroadcastChannel['close']>>;
  postMessage(...args: Parameters<BroadcastChannel['postMessage']>): Promise<ReturnType<BroadcastChannel['postMessage']>>;
}

export class BroadcastChannelMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly channelProvider: () => PromisifiedBroadcastChannel;

  private _channel: PromisifiedBroadcastChannel | undefined;

  protected readonly _messages$: Observable<T>;

  get channel(): PromisifiedBroadcastChannel {
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

    this.channelProvider = channelProvider as () => PromisifiedBroadcastChannel;

    this._messages$ = defer(() => of(this.channel)).pipe(
      switchMap((channel) => fromEvent<MessageEvent<T>>(channel, 'message')),
      map((event) => event.data)
    );
  }

  protected async _publish(message: T): Promise<void> {
    await this.channel.postMessage(message);
  }

  protected async _disposeAsync(): Promise<void> {
    await this._channel?.close();
    this._channel = undefined;
  }
}
