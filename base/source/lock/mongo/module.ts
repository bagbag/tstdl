import { container } from '#/container';
import type { MongoRepositoryConfig } from '#/database/mongo';
import { Lock } from '../lock';
import { LockProvider } from '../provider';
import { MongoLock } from './lock';
import type { MongoLockEntity } from './model';
import { MongoLockProvider } from './provider';

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
export function configureMongoLock(lockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity>, register: boolean): void {
  mongoLockModuleConfig.lockEntityRepositoryConfig = lockRepositoryConfig;

  if (register) {
    container.registerSingleton(LockProvider, { useToken: MongoLockProvider });
    container.register(Lock, { useToken: MongoLock });
  }
}
