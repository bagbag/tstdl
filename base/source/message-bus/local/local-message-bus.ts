import type { Observable, Subject } from 'rxjs';
import { filter, map } from 'rxjs';
import type { MessageBus } from '../message-bus';
import { MessageBusBase } from '../message-bus';
import type { LocalMessageBusItem } from './types';

export class LocalMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly subject: Subject<LocalMessageBusItem<T>>;
  private readonly source: symbol;

  protected _messages$: Observable<T>;

  constructor(subject: Subject<LocalMessageBusItem<T>>) {
    super();

    this.subject = subject;

    this.source = Symbol('LocalMessageBus source');

    this._messages$ = subject.pipe(
      filter((item) => item.source != this.source),
      map((item) => item.message)
    );
  }

  _publish(message: T): void {
    this.subject.next({ source: this.source, message });
  }

  _disposeAsync(): void {
    void 0;
  }
}
