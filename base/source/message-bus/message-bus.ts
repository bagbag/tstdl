import type { Injectable } from '#/container';
import { resolveArgumentType } from '#/container';
import type { Observable } from 'rxjs';
import type { AsyncDisposable } from '../disposable';
import { disposeAsync } from '../disposable';

export type MessageBusArgument = string;

export abstract class MessageBus<T> implements AsyncDisposable, Injectable<MessageBusArgument> {
  readonly [resolveArgumentType]: string;

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
