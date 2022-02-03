import { injectable } from '#/container';
import { Logger } from '#/logger';
import { assertStringPass } from '#/utils';
import type { Observable } from 'rxjs';
import { filter, map, Subject } from 'rxjs';
import type { MessageBus } from '../message-bus';
import { MessageBusBase } from '../message-bus-base';
import { LocalMessageBusProvider } from './local-message-bus-provider';
import type { LocalMessageBusItem } from './types';

@injectable({
  provider: {
    useFactory: (argument, container) => {
      const channel = assertStringPass(argument, 'LocalMessageBus resolve argument must be a string (channel)');
      return container.resolve(LocalMessageBusProvider).get(channel);
    }
  }
})
export class LocalMessageBus<T> extends MessageBusBase<T> implements MessageBus<T> {
  private readonly subject: Subject<LocalMessageBusItem<T>>;
  private readonly source: symbol;

  protected _messages$: Observable<T>;

  constructor(subject: Subject<LocalMessageBusItem<T>>, logger: Logger) {
    super(logger);

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
