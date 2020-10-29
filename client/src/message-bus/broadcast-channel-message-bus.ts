import { disposeAsync } from '@tstdl/base/disposable';
import type { MessageBus } from '@tstdl/base/message-bus';
import type { Observable } from 'rxjs';
import { fromEvent, Subject } from 'rxjs';
import { map, takeUntil } from 'rxjs/operators';

export class BroadcastChannelMessageBus<T> implements MessageBus<T> {
  private readonly channel: BroadcastChannel;
  private readonly closeSubject: Subject<void>;

  get message$(): Observable<T> {
    return fromEvent<MessageEvent<T>>(this.channel, 'message').pipe(
      takeUntil(this.closeSubject),
      map((event) => event.data)
    );
  }

  constructor(channel: BroadcastChannel) {
    this.channel = channel;

    this.closeSubject = new Subject();
  }

  async publish(message: T): Promise<void> {
    this.channel.postMessage(message);
  }

  async [disposeAsync](): Promise<void> {
    this.channel.close();
    this.closeSubject.next();
  }
}
