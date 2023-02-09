import { injectable, resolveArg } from '#/container';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MessageBus } from '../message-bus';
import type { MessageBusProvider } from '../message-bus-provider';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus';

@injectable()
export class BroadcastChannelMessageBusProvider implements MessageBusProvider {
  private readonly logger: Logger;

  constructor(@resolveArg<LoggerArgument>('BroadcastChannelMessageBusProvider') logger: Logger) {
    this.logger = logger;
  }

  get<T>(channel: string): MessageBus<T> {
    return new BroadcastChannelMessageBus(() => new BroadcastChannel(channel), this.logger);
  }
}
