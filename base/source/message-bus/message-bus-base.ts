import type { Logger } from '#/logger';
import type { Observable } from 'rxjs';
import { defer, merge, share, Subject, takeUntil } from 'rxjs';
import { disposeAsync } from '../disposable';
import { CancellationToken } from '../utils/cancellation-token';
import { MessageBus } from './message-bus';

export abstract class MessageBusBase<T> extends MessageBus<T> {
  private readonly logger: Logger;
  private readonly publishSubject: Subject<T>;
  protected readonly disposeToken: CancellationToken;

  readonly messages$: Observable<T>;
  readonly allMessages$: Observable<T>;

  /**
   * observable which emits all messages from *other* instances, but *none* published from itself
   */
  protected abstract _messages$: Observable<T>;

  constructor(logger: Logger) {
    super();

    this.logger = logger;

    this.publishSubject = new Subject();
    this.disposeToken = new CancellationToken();

    this.messages$ = defer(() => this._messages$).pipe(takeUntil(this.disposeToken.set$), share());
    this.allMessages$ = merge(this.messages$, this.publishSubject);
  }

  publishAndForget(message: T): void {
    void this._publishAndForget(message);
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

    return this._dispose();
  }

  private async _publishAndForget(message: T): Promise<void> {
    try {
      await this.publish(message);
    }
    catch (error: unknown) {
      this.logger.error(error as Error);
    }
  }

  /**
   * publish messages to other instances
   * @param message message to send to other instances
   */
  protected abstract _publish(message: T): void | Promise<void>;

  protected abstract _dispose(): void | Promise<void>;
}
