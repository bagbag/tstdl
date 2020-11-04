import type { MessageBus } from '@tstdl/base/message-bus';
import { MessageBusBase } from '@tstdl/base/message-bus';
import type { Observable } from 'rxjs';
import { fromEvent } from 'rxjs';
import { map, mapTo, shareReplay, switchMap, take, takeUntil, tap } from 'rxjs/operators';
import { broadcastChannel$ } from './broadcast-channel-observable';

export class BroadcastChannelMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly channel$: Observable<BroadcastChannel>;

  protected readonly _message$: Observable<T>;

  constructor(channelProvider: () => BroadcastChannel) {
    super();

    this.channel$ = broadcastChannel$(channelProvider).pipe(
      takeUntil(this.disposeToken.set$),
      shareReplay({ bufferSize: 1, refCount: true })
    );

    this._message$ = this.channel$.pipe(
      switchMap((channel) => fromEvent<MessageEvent<T>>(channel, 'message')),
      takeUntil(this.disposeToken.set$),
      map((event) => event.data)
    );
  }

  protected async _publish(message: T): Promise<void> {
    return this.channel$.pipe(
      tap((channel) => channel.postMessage(message)),
      take(1),
      mapTo(undefined)
    ).toPromise();
  }

  protected async _disposeAsync(): Promise<void> { }
}
