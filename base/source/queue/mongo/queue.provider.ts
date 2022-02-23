import type { Injectable } from '#/container';
import { container, forwardArg, resolveArg, resolveArgumentType, singleton } from '#/container';
import type { CollectionArgument, MongoRepositoryConfig } from '#/database/mongo';
import type { LockProviderArgument } from '#/lock';
import { LockProvider } from '#/lock';
import { MessageBusProvider } from '#/message-bus';
import type { QueueConfig } from '#/queue';
import { Queue, QueueProvider } from '#/queue';
import type { MongoJob } from './job';
import { MongoJobRepository } from './mongo-job.repository';
import { MongoQueue } from './queue';

let defaultJobRepositoryConfig: CollectionArgument<MongoJob>;

@singleton({ defaultArgumentProvider: () => defaultJobRepositoryConfig })
export class MongoQueueProvider extends QueueProvider implements Injectable<CollectionArgument<MongoJob>> {
  private readonly repository: MongoJobRepository<any>;
  private readonly lockProvider: LockProvider;
  private readonly messageBusProvider: MessageBusProvider;

  readonly [resolveArgumentType]: CollectionArgument<MongoJob>;

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
export function configureMongoQueue(jobRepositoryConfig: MongoRepositoryConfig<MongoJob>, register: boolean): void {
  defaultJobRepositoryConfig = jobRepositoryConfig;

  if (register) {
    container.registerSingleton(QueueProvider, { useToken: MongoQueueProvider });
    container.registerSingleton(Queue, { useToken: MongoQueue });
  }
}
