import type { MessageBus, MessageBusProvider } from '@tstdl/base/message-bus';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus';

export class BroadcastChannelMessageBusProvider implements MessageBusProvider {
  get<T>(channel: string): MessageBus<T> {
    const broadcastChannel = new BroadcastChannel(channel);
    return new BroadcastChannelMessageBus(broadcastChannel);
  }
}
