import { container } from '#/container';
import { MessageBus } from '../message-bus';
import { MessageBusProvider } from '../message-bus-provider';
import { LocalMessageBus } from './local-message-bus';
import { LocalMessageBusProvider } from './local-message-bus-provider';

/**
 * registers {@link LocalMessageBus} and {@link LocalMessageBusProvider} in global container
 */
export function configureLocalMessageBus(): void {
  container.register(MessageBus, { useToken: LocalMessageBus });
  container.registerSingleton(MessageBusProvider, { useToken: LocalMessageBusProvider });
}
