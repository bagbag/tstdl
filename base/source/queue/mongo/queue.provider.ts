import type { CollectionArgument, MongoRepositoryConfig } from '#/database/mongo/index.js';
import { ForwardArg, ResolveArg, Singleton } from '#/injector/decorators.js';
import { Injector } from '#/injector/injector.js';
import { resolveArgumentType, type Resolvable } from '#/injector/interfaces.js';
import { LockProvider, type LockProviderArgument } from '#/lock/index.js';
import { MessageBusProvider } from '#/message-bus/index.js';
import { Queue, QueueProvider, type QueueConfig } from '#/queue/index.js';
import type { MongoJob } from './job.js';
import { MongoJobRepository } from './mongo-job.repository.js';
import { MongoQueue } from './queue.js';

let defaultJobRepositoryConfig: CollectionArgument<MongoJob>;

@Singleton({ defaultArgumentProvider: () => defaultJobRepositoryConfig })
export class MongoQueueProvider extends QueueProvider implements Resolvable<CollectionArgument<MongoJob>> {
  private readonly repository: MongoJobRepository<any>;
  private readonly lockProvider: LockProvider;
  private readonly messageBusProvider: MessageBusProvider;

  declare readonly [resolveArgumentType]: CollectionArgument<MongoJob>;
  constructor(@ForwardArg() repository: MongoJobRepository<any>, @ResolveArg<LockProviderArgument>('queue:') lockProvider: LockProvider, messageBusProvider: MessageBusProvider) {
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
    Injector.registerSingleton(QueueProvider, { useToken: MongoQueueProvider });
    Injector.registerSingleton(Queue, { useToken: MongoQueue });
  }
}
