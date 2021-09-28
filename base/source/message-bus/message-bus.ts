import type { Observable } from 'rxjs';
import { defer, merge, Subject } from 'rxjs';
import { share, takeUntil } from 'rxjs/operators';
import type { AsyncDisposable } from '../disposable';
import { disposeAsync } from '../disposable';
import { CancellationToken } from '../utils';

export interface MessageBus<T> extends AsyncDisposable {
  readonly messages$: Observable<T>;
  readonly allMessages$: Observable<T>;

  publish(message: T): Promise<void>;
}

export abstract class MessageBusBase<T> implements MessageBus<T> {
  private readonly publishSubject: Subject<T>;
  protected readonly disposeToken: CancellationToken;

  readonly messages$: Observable<T>;
  readonly allMessages$: Observable<T>;

  protected abstract _messages$: Observable<T>;

  constructor() {
    this.publishSubject = new Subject();
    this.disposeToken = new CancellationToken();

    this.messages$ = defer(() => this._messages$).pipe(takeUntil(this.disposeToken.set$), share());
    this.allMessages$ = merge(this.messages$, this.publishSubject);
  }

  async publish(message: T): Promise<void> {
    if (this.disposeToken.isSet) {
      throw new Error('message-bus is disposed');
    }

    this.publishSubject.next(message);
    return this._publish(message);
  }

  async [disposeAsync](): Promise<void> {
    if (this.disposeToken.isSet) {
      throw new Error('message-bus is disposed');
    }

    this.disposeToken.set();
    this.publishSubject.complete();

    return this._disposeAsync();
  }

  protected abstract _publish(message: T): void | Promise<void>;

  protected abstract _disposeAsync(): void | Promise<void>;
}
