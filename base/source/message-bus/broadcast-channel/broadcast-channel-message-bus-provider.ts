import { Injectable, ResolveArg } from '#/injector/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import type { MessageBusProvider } from '../message-bus-provider.js';
import type { MessageBus } from '../message-bus.js';
import { BroadcastChannelMessageBus } from './broadcast-channel-message-bus.js';

@Injectable()
export class BroadcastChannelMessageBusProvider implements MessageBusProvider {
  private readonly logger: Logger;

  constructor(@ResolveArg<LoggerArgument>('BroadcastChannelMessageBusProvider') logger: Logger) {
    this.logger = logger;
  }

  get<T>(channel: string): MessageBus<T> {
    return new BroadcastChannelMessageBus(() => new BroadcastChannel(channel), this.logger);
  }
}
