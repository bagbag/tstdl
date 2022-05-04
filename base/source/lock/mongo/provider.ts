import { injectArg, resolveArg, resolveArgProvider, singleton } from '#/container';
import type { CollectionArgument } from '#/database/mongo';
import type { Lock } from '#/lock';
import { LockProvider } from '#/lock';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import { assertDefinedPass } from '#/utils/type-guards';
import { MongoLock } from './lock';
import type { MongoLockEntity } from './model';
import { mongoLockModuleConfig } from './module';
import { MongoLockRepository } from './mongo-lock-repository';

const collectionArgumentProvider = (): CollectionArgument<MongoLockEntity> => assertDefinedPass(mongoLockModuleConfig.lockEntityRepositoryConfig, 'mongo lock module not configured');

@singleton({ defaultArgument: '' })
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
