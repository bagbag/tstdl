import type { Injectable } from '#/container/index.js';
import type { resolveArgumentType } from '#/container/index.js';
import type { Observable } from 'rxjs';
import type { AsyncDisposable } from '../disposable/disposable.js';
import { disposeAsync } from '../disposable/disposable.js';

export type MessageBusArgument = string;

export abstract class MessageBus<T> implements AsyncDisposable, Injectable<MessageBusArgument> {
  declare readonly [resolveArgumentType]: string;

  /** messages from other instances */
  abstract readonly messages$: Observable<T>;

  /** messages from other instances and itself */
  abstract readonly allMessages$: Observable<T>;

  async dispose(): Promise<void> {
    await this[disposeAsync]();
  }

  abstract publish(message: T): Promise<void>;
  abstract publishAndForget(message: T): void;

  abstract [disposeAsync](): Promise<void>;
}
