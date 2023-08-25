import type { MongoRepositoryConfig } from '#/database/mongo/index.js';
import { Injector } from '#/injector/injector.js';
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
    Injector.registerSingleton(LockProvider, { useToken: MongoLockProvider });
    Injector.register(Lock, { useToken: MongoLock });
  }
}
