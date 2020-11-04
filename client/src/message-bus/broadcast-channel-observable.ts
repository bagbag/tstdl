import { Observable } from 'rxjs';

export function broadcastChannel$(channelProvider: () => BroadcastChannel): Observable<BroadcastChannel> {
  return new Observable<BroadcastChannel>((subscriber) => {
    let broadcastChannel: BroadcastChannel | undefined;

    try {
      broadcastChannel = channelProvider();
      subscriber.next(broadcastChannel);
    }
    catch (error: unknown) {
      subscriber.error(error);
    }

    return () => broadcastChannel?.close();
  });
}
