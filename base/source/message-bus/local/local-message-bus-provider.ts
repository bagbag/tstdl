import { container, resolveArg, singleton } from '#/container';
import { WeakRefMap } from '#/data-structures/weak-ref-map';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { FactoryMap } from '#/utils/factory-map';
import { isUndefined } from '#/utils/type-guards';
import { Subject } from 'rxjs';
import { MessageBus } from '../message-bus';
import { MessageBusProvider } from '../message-bus-provider';
import { LocalMessageBus } from './local-message-bus';
import type { LocalMessageBusItem } from './types';

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

/**
 * configure local message bus module
 * @param register whether to register for {@link LocalMessageBus} and {@link LocalMessageBusProvider}
 */
export function configureLocalMessageBus(register: boolean = true): void {
  if (register) {
    container.registerSingleton(MessageBusProvider, { useToken: LocalMessageBusProvider });
    container.register(MessageBus, { useToken: LocalMessageBus });
  }
}
