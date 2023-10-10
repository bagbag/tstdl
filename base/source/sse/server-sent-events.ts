import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { Observable } from 'rxjs';
import { distinctUntilChanged, filter, fromEvent, map, merge, ReplaySubject, share, shareReplay, startWith, takeUntil } from 'rxjs';

export enum ServerSentEventsState {
  Connecting = 0,
  Open = 1,
  Closed = 2
}

export class ServerSentEvents {
  private readonly eventSource: EventSource;
  private readonly closeSubject: ReplaySubject<void>;

  readonly open$: Observable<void>;
  readonly close$: Observable<void>;
  readonly error$: Observable<Event>;

  readonly state$: Observable<ServerSentEventsState>;
  readonly isConnecting$: Observable<boolean>;
  readonly isOpen$: Observable<boolean>;
  readonly isClosed$: Observable<boolean>;

  get state(): ServerSentEventsState {
    switch (this.eventSource.readyState) {
      case EventSource.CONNECTING:
        return ServerSentEventsState.Connecting;

      case EventSource.OPEN:
        return ServerSentEventsState.Open;

      case EventSource.CLOSED:
        return ServerSentEventsState.Closed;

      default:
        throw new NotSupportedError(`Unknown EventSource readyState ${this.eventSource.readyState}`);
    }
  }

  constructor(url: string, options?: EventSourceInit) {
    this.eventSource = new EventSource(url, options);
    this.closeSubject = new ReplaySubject(1);

    const open$ = fromEvent(this.eventSource, 'open');
    this.close$ = this.closeSubject.asObservable();
    this.error$ = fromEvent(this.eventSource, 'error').pipe(takeUntil(this.close$), share());

    this.state$ = merge(open$, this.error$, this.close$).pipe(startWith(undefined), map(() => this.state), distinctUntilChanged(), shareReplay({ bufferSize: 1, refCount: true }));
    this.isConnecting$ = this.state$.pipe(map((state) => state == ServerSentEventsState.Connecting), shareReplay({ bufferSize: 1, refCount: true }));
    this.isOpen$ = this.state$.pipe(map((state) => state == ServerSentEventsState.Open), shareReplay({ bufferSize: 1, refCount: true }));
    this.isClosed$ = this.state$.pipe(map((state) => state == ServerSentEventsState.Closed), shareReplay({ bufferSize: 1, refCount: true }));

    this.open$ = this.isOpen$.pipe(filter((open) => open), map(() => undefined), takeUntil(this.close$), share());
  }

  message$(event?: string): Observable<MessageEvent<string>> {
    return fromEvent<MessageEvent<string>>(this.eventSource, event ?? 'message').pipe(takeUntil(this.close$));
  }

  close(): void {
    this.eventSource.close();
    this.closeSubject.next();
    this.closeSubject.complete();
  }
}
