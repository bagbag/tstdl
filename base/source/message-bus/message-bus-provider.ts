import type { MessageBus } from './message-bus';

export abstract class MessageBusProvider {
  abstract get<T>(channel: string): MessageBus<T>;
}
