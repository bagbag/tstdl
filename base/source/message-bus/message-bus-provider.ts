import type { MessageBus } from './message-bus.js';

export abstract class MessageBusProvider {
  abstract get<T>(channel: string): MessageBus<T>;
}
