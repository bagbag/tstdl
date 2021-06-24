import type { MessageBus, MessageBusProvider } from '@tstdl/base/message-bus';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus';

export class BroadcastChannelMessageBusProvider implements MessageBusProvider {
  get<T>(channel: string): MessageBus<T> {
    return new BroadcastChannelMessageBus(() => new BroadcastChannel(channel));
  }
}
