import type { MessageBus } from '../message-bus';
import type { MessageBusProvider } from '../message-bus-provider';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus';

export class BroadcastChannelMessageBusProvider implements MessageBusProvider {
  get<T>(channel: string): MessageBus<T> {
    return new BroadcastChannelMessageBus(() => new BroadcastChannel(channel));
  }
}
