import type { CollectionArgument, MongoRepositoryConfig } from '#/database/mongo/index.js';
import { inject, injectArgument, Injector, resolveArgumentType, Singleton, type Resolvable } from '#/injector/index.js';
import { LockProvider } from '#/lock/index.js';
import { MessageBusProvider } from '#/message-bus/index.js';
import { Queue, QueueProvider, type QueueConfig } from '#/queue/index.js';
import type { MongoJob } from './job.js';
import { MongoJobRepository } from './mongo-job.repository.js';
import { MongoQueue } from './queue.js';

let defaultJobRepositoryConfig: CollectionArgument<MongoJob>;

@Singleton({ defaultArgumentProvider: () => defaultJobRepositoryConfig })
export class MongoQueueProvider extends QueueProvider implements Resolvable<CollectionArgument<MongoJob>> {
  private readonly repository = inject(MongoJobRepository<any>, injectArgument(this));
  private readonly lockProvider = inject(LockProvider, 'queue:');
  private readonly messageBusProvider = inject(MessageBusProvider);

  declare readonly [resolveArgumentType]: CollectionArgument<MongoJob>;

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
