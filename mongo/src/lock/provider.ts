import { Lock, LockProvider } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { MongoLock } from './lock';
import { MongoLockRepository } from './mongo-lock-repository';

export class MongoLockProvider implements LockProvider {
  private readonly lockRepository: MongoLockRepository;
  private readonly logger: Logger;

  constructor(lockRepository: MongoLockRepository, logger: Logger) {
    this.lockRepository = lockRepository;
    this.logger = logger;
  }

  get(ressource: string): Lock {
    return new MongoLock(this.lockRepository, this.logger, ressource);
  }
}
