import { FactoryMap, isUndefined } from '#/utils';
import { WeakRefMap } from '#/utils/weak-ref-map';
import { Subject } from 'rxjs';
import type { MessageBus } from '../message-bus';
import type { MessageBusProvider } from '../message-bus-provider';
import { LocalMessageBus } from './local-message-bus';
import type { LocalMessageBusItem } from './types';

export class LocalMessageBusProvider implements MessageBusProvider {
  private readonly channelSubjectsMap: FactoryMap<string, WeakRef<Subject<LocalMessageBusItem<any>>>>;

  constructor() {
    this.channelSubjectsMap = new FactoryMap<string, WeakRef<any>>(() => new WeakRef(new Subject()), WeakRefMap.supported ? new WeakRefMap() : undefined);
  }

  get<T>(channel: string): MessageBus<T> {
    const subject = this.channelSubjectsMap.get(channel).deref();

    if (isUndefined(subject)) {
      this.channelSubjectsMap.delete(channel);
      return this.get(channel);
    }

    return new LocalMessageBus(subject);
  }
}
