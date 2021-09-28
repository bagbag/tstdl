import type { Logger } from '#/logger';
import type { Observable } from 'rxjs';
import { defer, merge, Subject } from 'rxjs';
import { share, takeUntil } from 'rxjs/operators';
import { disposeAsync } from '../disposable';
import { CancellationToken } from '../utils';
import type { MessageBus } from './message-bus';


export abstract class MessageBusBase<T> implements MessageBus<T> {
  private readonly logger: Logger;
  private readonly publishSubject: Subject<T>;
  protected readonly disposeToken: CancellationToken;

  readonly messages$: Observable<T>;
  readonly allMessages$: Observable<T>;

  protected abstract _messages$: Observable<T>;

  constructor(logger: Logger) {
    this.logger = logger;

    this.publishSubject = new Subject();
    this.disposeToken = new CancellationToken();

    this.messages$ = defer(() => this._messages$).pipe(takeUntil(this.disposeToken.set$), share());
    this.allMessages$ = merge(this.messages$, this.publishSubject);
  }

  async publishAndForget(message: T): Promise<void> {
    try {
      await this.publish(message);
    }
    catch (error: unknown) {
      this.logger.error(error as Error);
    }
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
