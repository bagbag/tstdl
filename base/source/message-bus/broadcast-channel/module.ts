import { container } from '#/container';
import { MessageBus } from '../message-bus';
import { MessageBusProvider } from '../message-bus-provider';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus';
import { BroadcastChannelMessageBusProvider } from './broadcast-channel-message-bus-provider';

/**
 * registers {@link BroadcastChannelMessageBus} and {@link BroadcastChannelMessageBusProvider} in global container
 */
export function configureBroadcastChannelMessageBus(): void {
  container.register(MessageBus, { useToken: BroadcastChannelMessageBus });
  container.registerSingleton(MessageBusProvider, { useToken: BroadcastChannelMessageBusProvider });
}
