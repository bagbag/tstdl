import type { Lock, LockProvider } from '#/lock';
import type { Logger } from '#/logger';
import { MongoLock } from './lock';
import type { MongoLockRepository } from './mongo-lock-repository';

export class MongoLockProvider implements LockProvider {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;
  private readonly _prefix: string;

  constructor(lockRepository: MongoLockRepository, logger: Logger, prefix: string = '') {
    this.lockRepository = lockRepository;
    this.logger = logger;
    this._prefix = prefix;
  }

  prefix(prefix: string): LockProvider {
    return new MongoLockProvider(this.lockRepository, this.logger, this._prefix + prefix);
  }

  get(resource: string): Lock {
    return new MongoLock(this.lockRepository, this.logger, this._prefix + resource);
  }
}
