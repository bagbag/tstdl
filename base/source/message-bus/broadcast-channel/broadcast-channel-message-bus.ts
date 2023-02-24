import { injectable } from '#/container/index.js';
import { Logger } from '#/logger/index.js';
import { assertStringPass, isUndefined } from '#/utils/type-guards.js';
import type { Observable } from 'rxjs';
import { defer, fromEvent, map, of, switchMap } from 'rxjs';
import { MessageBusBase } from '../message-bus-base.js';
import type { MessageBus } from '../message-bus.js';
import { BroadcastChannelMessageBusProvider } from './broadcast-channel-message-bus-provider.js';

/** return values wrapped in Promise for polyfills which returns promises */
interface PromisifiedBroadcastChannel extends BroadcastChannel {
  close(...args: Parameters<BroadcastChannel['close']>): void | Promise<void>;
  postMessage(...args: Parameters<BroadcastChannel['postMessage']>): void | Promise<void>;
}

@injectable({
  provider: {
    useFactory: (argument, context) => {
      const channel = assertStringPass(argument, 'LocalMessageBus resolve argument must be a string (channel)');
      return context.resolve(BroadcastChannelMessageBusProvider).get(channel);
    }
  }
})
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

  protected async _dispose(): Promise<void> {
    await this._channel?.close();
    this._channel = undefined;
  }
}
