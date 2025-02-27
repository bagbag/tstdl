import { Singleton } from '#/injector/decorators.js';
import { inject } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import { QueueProvider, type QueueConfig } from '#/queue/index.js';
import type { ObjectLiteral } from '#/types.js';
import { PostgresQueue } from './queue.js';

@Singleton()
export class PostgresQueueProvider extends QueueProvider {
  readonly #injector = inject(Injector);

  get<T extends ObjectLiteral>(name: string, config?: QueueConfig): PostgresQueue<T> {
    return this.#injector.resolve(PostgresQueue<T>, { ...config, name: name });
  }
}
