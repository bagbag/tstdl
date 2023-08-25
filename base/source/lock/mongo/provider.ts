import type { CollectionArgument } from '#/database/mongo/index.js';
import { InjectArg, ResolveArg, ResolveArgProvider, Singleton } from '#/injector/decorators.js';
import type { Lock } from '#/lock/index.js';
import { LockProvider } from '#/lock/index.js';
import type { LoggerArgument } from '#/logger/index.js';
import { Logger } from '#/logger/index.js';
import { assertDefinedPass } from '#/utils/type-guards.js';
import { MongoLock } from './lock.js';
import type { MongoLockEntity } from './model.js';
import { mongoLockModuleConfig } from './module.js';
import { MongoLockRepository } from './mongo-lock-repository.js';

const collectionArgumentProvider = (): CollectionArgument<MongoLockEntity> => assertDefinedPass(mongoLockModuleConfig.lockEntityRepositoryConfig, 'mongo lock module not configured');

@Singleton()
export class MongoLockProvider extends LockProvider {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly _prefix: string;

  constructor(@ResolveArgProvider<CollectionArgument<MongoLockEntity>>(collectionArgumentProvider) lockRepository: MongoLockRepository, @ResolveArg<LoggerArgument>('MongoLock') logger: Logger, @InjectArg() prefix: string = '') {
    super();

    this.lockRepository = lockRepository;
    this.logger = logger;
    this._prefix = prefix;
  }

  prefix(prefix: string): LockProvider {
    return new MongoLockProvider(this.lockRepository, this.logger, this._prefix + prefix);
  }

  get(resource: string): Lock {
    return new MongoLock(this.lockRepository, this._prefix + resource, this.logger);
  }
}
