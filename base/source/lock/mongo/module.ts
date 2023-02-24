import { container } from '#/container/index.js';
import type { MongoRepositoryConfig } from '#/database/mongo/index.js';
import { Lock } from '../lock.js';
import { LockProvider } from '../provider.js';
import { MongoLock } from './lock.js';
import type { MongoLockEntity } from './model.js';
import { MongoLockProvider } from './provider.js';

export type MongoLockModuleConfig = {
  lockEntityRepositoryConfig: MongoRepositoryConfig<MongoLockEntity> | undefined
};

export const mongoLockModuleConfig: MongoLockModuleConfig = {
  lockEntityRepositoryConfig: undefined
};

/**
 * configure mongo lock module
 * @param lockRepositoryConfig repository configuration for locks
 * @param register whether to register for {@link Lock} and {@link LockProvider}
 */
export function configureMongoLock(lockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity>, register: boolean = true): void {
  mongoLockModuleConfig.lockEntityRepositoryConfig = lockRepositoryConfig;

  if (register) {
    container.registerSingleton(LockProvider, { useToken: MongoLockProvider });
    container.register(Lock, { useToken: MongoLock });
  }
}
