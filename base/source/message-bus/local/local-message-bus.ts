import type { Observable } from 'rxjs';
import { Subject, filter, map } from 'rxjs';

import { Injectable } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { assertStringPass } from '#/utils/type-guards.js';
import { MessageBusBase } from '../message-bus-base.js';
import type { MessageBus } from '../message-bus.js';
import { LocalMessageBusProvider } from './local-message-bus-provider.js';
import type { LocalMessageBusItem } from './types.js';

@Injectable({
  provider: {
    useFactory: (argument, context) => {
      const channel = assertStringPass(argument, 'LocalMessageBus resolve argument must be a string (channel)');
      return context.resolve(LocalMessageBusProvider).get(channel);
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

  _dispose(): void {
    this.subject.complete();
  }
}
