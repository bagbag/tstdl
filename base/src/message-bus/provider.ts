import { MessageBus } from './message-bus';

export interface MessageBusProvider {
  get<T>(key: string): MessageBus<T>;
}
