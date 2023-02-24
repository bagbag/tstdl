import { container } from '#/container/index.js';
import { MessageBusProvider } from '../message-bus-provider.js';
import { MessageBus } from '../message-bus.js';
import { BroadcastChannelMessageBusProvider } from './broadcast-channel-message-bus-provider.js';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus.js';

/**
 * registers {@link BroadcastChannelMessageBus} and {@link BroadcastChannelMessageBusProvider} in global container
 */
export function configureBroadcastChannelMessageBus(): void {
  container.register(MessageBus, { useToken: BroadcastChannelMessageBus });
  container.registerSingleton(MessageBusProvider, { useToken: BroadcastChannelMessageBusProvider });
}
