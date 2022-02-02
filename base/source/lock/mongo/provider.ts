import { container, forwardArg, injectArg, resolveArg, singleton } from '#/container';
import type { CollectionArgument } from '#/database/mongo';
import { Lock, LockProvider } from '#/lock';
import type { LoggerArgument } from '#/logger';
import { Logger } from '#/logger';
import type { MongoRepositoryConfig } from '#/mongo.instance-provider';
import { MongoLock } from './lock';
import type { MongoLockEntity } from './model';
import { MongoLockRepository } from './mongo-lock-repository';

let defaultLockEntityRepositoryConfig: CollectionArgument<MongoLockEntity>;

@singleton({ defaultArgumentProvider: () => defaultLockEntityRepositoryConfig })
export class MongoLockProvider extends LockProvider {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly _prefix: string;

  constructor(@forwardArg() lockRepository: MongoLockRepository, @resolveArg<LoggerArgument>('MongoLock') logger: Logger, @injectArg() prefix: string = '') {
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

/**
 * configure mongo lock module
 * @param lockRepositoryConfig repository configuration for locks
 * @param register whether to register for {@link Lock} and {@link LockProvider}
 */
export function configureMongoLock(lockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity>, register: boolean): void {
  defaultLockEntityRepositoryConfig = lockRepositoryConfig;

  if (register) {
    container.register(LockProvider, { useToken: MongoLockProvider });
    container.register(Lock, { useToken: MongoLock });
  }
}
