import type { Injectable } from '#/container/index.js';
import { container, forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container/index.js';
import type { CollectionArgument, MongoRepositoryConfig } from '#/database/mongo/index.js';
import type { LockProviderArgument } from '#/lock/index.js';
import { LockProvider } from '#/lock/index.js';
import { MessageBusProvider } from '#/message-bus/index.js';
import type { QueueConfig } from '#/queue/index.js';
import { Queue, QueueProvider } from '#/queue/index.js';
import type { MongoJob } from './job.js';
import { MongoJobRepository } from './mongo-job.repository.js';
import { MongoQueue } from './queue.js';

let defaultJobRepositoryConfig: CollectionArgument<MongoJob>;

@singleton({ defaultArgumentProvider: () => defaultJobRepositoryConfig })
export class MongoQueueProvider extends QueueProvider implements Injectable<CollectionArgument<MongoJob>> {
  private readonly repository: MongoJobRepository<any>;
  private readonly lockProvider: LockProvider;
  private readonly messageBusProvider: MessageBusProvider;

  declare readonly [resolveArgumentType]: CollectionArgument<MongoJob>;
  constructor(@forwardArg() repository: MongoJobRepository<any>, @resolveArg<LockProviderArgument>('queue:') lockProvider: LockProvider, messageBusProvider: MessageBusProvider) {
    super();

    this.repository = repository;
    this.lockProvider = lockProvider;
    this.messageBusProvider = messageBusProvider;
  }

  get<T>(name: string, config?: QueueConfig): MongoQueue<T> {
    const lock = this.lockProvider.get(name);
    return new MongoQueue<T>(this.repository as MongoJobRepository<T>, lock, this.messageBusProvider, name, config);
  }
}

/**
 * configure mongo queue module
 * @param jobRepositoryConfig repository configuration for jobs
 * @param register whether to register for {@link Queue} and {@link QueueProvider}
 */
export function configureMongoQueue(jobRepositoryConfig: MongoRepositoryConfig<MongoJob>, register: boolean = true): void {
  defaultJobRepositoryConfig = jobRepositoryConfig;

  if (register) {
    container.registerSingleton(QueueProvider, { useToken: MongoQueueProvider });
    container.registerSingleton(Queue, { useToken: MongoQueue });
  }
}
