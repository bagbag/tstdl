import type { MessageBus } from '@tstdl/base/message-bus';
import { MessageBusBase } from '@tstdl/base/message-bus';
import type { Observable } from 'rxjs';
import { fromEvent } from 'rxjs';
import { map } from 'rxjs/operators';

export class BroadcastChannelMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly channel: BroadcastChannel;

  protected readonly _message$: Observable<T>;

  constructor(channel: BroadcastChannel) {
    super();
    this.channel = channel;

    this._message$ = fromEvent<MessageEvent<T>>(this.channel, 'message').pipe(map((event) => event.data));
  }

  protected async _publish(message: T): Promise<void> {
    this.channel.postMessage(message);
  }

  protected async _disposeAsync(): Promise<void> {
    this.channel.close();
  }
}
