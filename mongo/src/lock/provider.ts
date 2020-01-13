import { Lock, LockProvider } from '@tstdl/base/lock';
import { Logger } from '@tstdl/base/logger';
import { MongoBaseRepository } from '../base-repository';
import { Collection, TypedIndexSpecification } from '../types';
import { MongoLock } from './lock';
import { LockEntity } from './model';

const indexes: TypedIndexSpecification<LockEntity>[] = [
  { key: { ressource: 1 }, unique: true },
  { key: { expire: 1 }, expireAfterSeconds: 1 }
];

export class MongoLockProvider implements LockProvider {
  private readonly lockRepository: MongoBaseRepository<LockEntity>;
  private readonly logger: Logger;

  constructor(collection: Collection<LockEntity>, logger: Logger) {
    this.lockRepository = new MongoBaseRepository(collection);
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    return this.lockRepository.createIndexes(indexes);
  }

  get(ressource: string): Lock {
    return new MongoLock(this.lockRepository, this.logger, ressource);
  }
}
