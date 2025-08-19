import { Subject } from 'rxjs';

import { WeakRefMap } from '#/data-structures/weak-ref-map.js';
import { inject, Singleton } from '#/injector/index.js';
import { Logger } from '#/logger/index.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { isUndefined } from '#/utils/type-guards.js';
import { MessageBusProvider } from '../message-bus-provider.js';
import { LocalMessageBus } from './local-message-bus.js';
import type { LocalMessageBusItem } from './types.js';

@Singleton()
export class LocalMessageBusProvider extends MessageBusProvider {
  private readonly logger = inject(Logger, LocalMessageBusProvider.name);
  private readonly channelSubjectsMap = new FactoryMap<string, Subject<LocalMessageBusItem<any>>>(() => new Subject(), WeakRefMap.supported ? new WeakRefMap() : undefined);

  get<T>(channel: string): LocalMessageBus<T> {
    const subject = this.channelSubjectsMap.get(channel);

    if (isUndefined(subject)) {
      this.channelSubjectsMap.delete(channel);
      return this.get(channel);
    }

    return new LocalMessageBus<T>(subject, this.logger);
  }
}
