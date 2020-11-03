import type { Observable } from 'rxjs';
import { defer, merge, Subject } from 'rxjs';
import { share, takeUntil } from 'rxjs/operators';
import type { AsyncDisposable } from '../disposable';
import { disposeAsync } from '../disposable';
import { CancellationToken } from '../utils';

export interface MessageBus<T> extends AsyncDisposable {
  readonly message$: Observable<T>;
  readonly allMessage$: Observable<T>;

  publish(message: T): Promise<void>;
}

export abstract class MessageBusBase<T> implements MessageBus<T> {
  private readonly publishSubject: Subject<T>;
  protected readonly disposeToken: CancellationToken;

  readonly message$: Observable<T>;
  readonly allMessage$: Observable<T>;

  protected abstract _message$: Observable<T>;

  constructor() {
    this.publishSubject = new Subject();
    this.disposeToken = new CancellationToken();

    this.message$ = defer(() => this._message$).pipe(takeUntil(this.disposeToken.set$), share());
    this.allMessage$ = merge(this.message$, this.publishSubject).pipe(takeUntil(this.disposeToken.set$));
  }

  async publish(message: T): Promise<void> {
    if (this.disposeToken.isSet) {
      throw new Error('message-bus is disposed');
    }

    this.publishSubject.next(message);
    return this._publish(message);
  }

  async [disposeAsync](): Promise<void> {
    this.disposeToken.set();
    return this._disposeAsync();
  }

  protected abstract _publish(message: T): Promise<void>;

  protected abstract _disposeAsync(): Promise<void>;
}
