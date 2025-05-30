import { NotSupportedError } from '#/errors/not-supported.error.js';
import { ReplaySubject, distinctUntilChanged, filter, fromEvent, map, merge, share, shareReplay, startWith, takeUntil, type Observable } from 'rxjs';

/**
 * Represents the possible states of a Server-Sent Events connection.
 */
export enum ServerSentEventsState {

  /**
   * The connection is currently being established.
   */
  Connecting = 0,

  /**
   * The connection is open and ready to receive events.
   */
  Open = 1,

  /**
   * The connection is closed.
   */
  Closed = 2,
}

/**
 * A wrapper around the EventSource API, providing an RxJS-friendly interface for Server-Sent Events.
 */
export class ServerSentEvents {
  private readonly eventSource: EventSource;
  private readonly closeSubject: ReplaySubject<void>;

  /**
   * An observable that emits when the connection is open.
   */
  readonly open$: Observable<void>;

  /**
   * An observable that emits when the connection is closed.
   */
  readonly close$: Observable<void>;

  /**
   * An observable that emits when an error occurs with the connection.
   */
  readonly error$: Observable<Event>;

  /**
   * An observable that emits the current state of the connection.
   */
  readonly state$: Observable<ServerSentEventsState>;

  /**
   * An observable that emits `true` when the connection is in the 'Connecting' state, `false` otherwise.
   */
  readonly isConnecting$: Observable<boolean>;

  /**
   * An observable that emits `true` when the connection is in the 'Open' state, `false` otherwise.
   */
  readonly isOpen$: Observable<boolean>;

  /**
   * An observable that emits `true` when the connection is in the 'Closed' state, `false` otherwise.
   */
  readonly isClosed$: Observable<boolean>;

  /**
   * Gets the current state of the Server-Sent Events connection.
   * @returns The current state.
   * @throws If the readyState of the EventSource is unknown.
   */
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

  /**
   * Creates a new ServerSentEvents instance.
   * @param url The URL of the server-sent events endpoint.
   * @param options Optional EventSource initialization options.
   */
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

  /**
   * Returns an observable of message events for a specific event type or default to 'message' event.
   * @param event The event type to listen for. Defaults to 'message'.
   * @returns An observable of message events.
   */
  message$(event?: string): Observable<MessageEvent<string>> {
    return fromEvent<MessageEvent<string>>(this.eventSource, event ?? 'message').pipe(takeUntil(this.close$));
  }

  /**
   * Closes the Server-Sent Events connection.
   */
  close(): void {
    this.eventSource.close();
    this.closeSubject.next();
    this.closeSubject.complete();
  }
}
