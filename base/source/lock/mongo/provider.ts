import { injectArg, resolveArg, resolveArgProvider, singleton } from '#/container/index.js';
import type { CollectionArgument } from '#/database/mongo/index.js';
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

@singleton()
export class MongoLockProvider extends LockProvider {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly _prefix: string;

  constructor(@resolveArgProvider<CollectionArgument<MongoLockEntity>>(collectionArgumentProvider) lockRepository: MongoLockRepository, @resolveArg<LoggerArgument>('MongoLock') logger: Logger, @injectArg() prefix: string = '') {
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
