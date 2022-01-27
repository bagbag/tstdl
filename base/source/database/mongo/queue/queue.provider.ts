import type { Injectable } from '#/container';
import { container, forwardArg, resolveArgumentType, singleton } from '#/container';
import { MessageBusProvider } from '#/message-bus';
import type { MongoRepositoryConfig } from '#/mongo.instance-provider';
import type { QueueConfig } from '#/queue';
import { Queue, QueueProvider } from '#/queue';
import type { CollectionArgument } from '../types';
import type { MongoJob } from './job';
import { MongoJobRepository } from './mongo-job.repository';
import { MongoQueue } from './queue';

let defaultJobRepositoryConfig: CollectionArgument<MongoJob>;

@singleton({ defaultArgumentProvider: () => defaultJobRepositoryConfig })
export class MongoQueueProvider extends QueueProvider implements Injectable<CollectionArgument<MongoJob>> {
  private readonly repository: MongoJobRepository<any>;
  private readonly messageBusProvider: MessageBusProvider;

  readonly [resolveArgumentType]?: CollectionArgument<MongoJob>;

  constructor(@forwardArg() repository: MongoJobRepository<any>, messageBusProvider: MessageBusProvider) {
    super();

    this.repository = repository;
    this.messageBusProvider = messageBusProvider;
  }

  get<T>(name: string, config?: QueueConfig): MongoQueue<T> {
    return new MongoQueue<T>(this.repository as MongoJobRepository<T>, this.messageBusProvider, name, config);
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
    container.register(QueueProvider, { useToken: MongoQueueProvider });
    container.register(Queue, { useToken: MongoQueue });
  }
}
