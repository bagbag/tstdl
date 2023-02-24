import { resolveArg, singleton } from '#/container/index.js';
import { WeakRefMap } from '#/data-structures/weak-ref-map.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { FactoryMap } from '#/utils/factory-map.js';
import { isUndefined } from '#/utils/type-guards.js';
import { Subject } from 'rxjs';
import { MessageBusProvider } from '../message-bus-provider.js';
import { LocalMessageBus } from './local-message-bus.js';
import type { LocalMessageBusItem } from './types.js';

@singleton()
export class LocalMessageBusProvider extends MessageBusProvider {
  private readonly logger: Logger;
  private readonly channelSubjectsMap: FactoryMap<string, Subject<LocalMessageBusItem<any>>>;

  constructor(@resolveArg<LoggerArgument>('LocalMessageBus') logger: Logger) {
    super();

    this.logger = logger;
    this.channelSubjectsMap = new FactoryMap<string, Subject<LocalMessageBusItem>>(() => new Subject(), WeakRefMap.supported ? new WeakRefMap() : undefined);
  }

  get<T>(channel: string): LocalMessageBus<T> {
    const subject = this.channelSubjectsMap.get(channel);

    if (isUndefined(subject)) {
      this.channelSubjectsMap.delete(channel);
      return this.get(channel);
    }

    return new LocalMessageBus<T>(subject, this.logger);
  }
}
