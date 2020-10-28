import type { MessageBus } from './message-bus';

export interface MessageBusProvider {
  get<T>(channel: string): MessageBus<T>;
}
