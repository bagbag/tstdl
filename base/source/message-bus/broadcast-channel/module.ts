import { Injector } from '#/injector/injector.js';
import { MessageBusProvider } from '../message-bus-provider.js';
import { MessageBus } from '../message-bus.js';
import { BroadcastChannelMessageBusProvider } from './broadcast-channel-message-bus-provider.js';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus.js';

/**
 * registers {@link BroadcastChannelMessageBus} and {@link BroadcastChannelMessageBusProvider} in global container
 */
export function configureBroadcastChannelMessageBus(): void {
  Injector.register(MessageBus, { useToken: BroadcastChannelMessageBus });
  Injector.registerSingleton(MessageBusProvider, { useToken: BroadcastChannelMessageBusProvider });
}
