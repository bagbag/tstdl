import type { Observable } from 'rxjs';

import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';

export type MessageBusArgument = string;

export abstract class MessageBus<T> implements AsyncDisposable, Resolvable<MessageBusArgument> {
  declare readonly [resolveArgumentType]: string;

  /** Messages from other instances */
  abstract readonly messages$: Observable<T>;

  /** Messages from other instances and itself */
  abstract readonly allMessages$: Observable<T>;

  async dispose(): Promise<void> {
    await this[Symbol.asyncDispose]();
  }

  abstract publish(message: T): Promise<void>;
  abstract publishAndForget(message: T): void;

  abstract [Symbol.asyncDispose](): Promise<void>;
}
