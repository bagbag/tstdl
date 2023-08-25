import { Injector } from '#/injector/injector.js';
import { MessageBusProvider } from '../message-bus-provider.js';
import { MessageBus } from '../message-bus.js';
import { LocalMessageBusProvider } from './local-message-bus-provider.js';
import { LocalMessageBus } from './local-message-bus.js';

/**
 * registers {@link LocalMessageBus} and {@link LocalMessageBusProvider} in global container
 */
export function configureLocalMessageBus(): void {
  Injector.register(MessageBus, { useToken: LocalMessageBus });
  Injector.registerSingleton(MessageBusProvider, { useToken: LocalMessageBusProvider });
}
