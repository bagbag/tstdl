import { WeakRefMap } from '#/data-structures';
import type { Logger } from '#/logger';
import { FactoryMap } from '#/utils/factory-map';
import { isUndefined } from '#/utils/type-guards';
import { Subject } from 'rxjs';
import type { MessageBus } from '../message-bus';
import type { MessageBusProvider } from '../message-bus-provider';
import { LocalMessageBus } from './local-message-bus';
import type { LocalMessageBusItem } from './types';

export class LocalMessageBusProvider implements MessageBusProvider {
  private readonly logger: Logger;
  private readonly channelSubjectsMap: FactoryMap<string, Subject<LocalMessageBusItem<any>>>;

  constructor(logger: Logger) {
    this.logger = logger;
    this.channelSubjectsMap = new FactoryMap<string, Subject<LocalMessageBusItem>>(() => new Subject(), WeakRefMap.supported ? new WeakRefMap() : undefined);
  }

  get<T>(channel: string): MessageBus<T> {
    const subject = this.channelSubjectsMap.get(channel);

    if (isUndefined(subject)) {
      this.channelSubjectsMap.delete(channel);
      return this.get(channel);
    }

    return new LocalMessageBus(subject, this.logger);
  }
}
