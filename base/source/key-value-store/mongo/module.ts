import { container } from '#/container';
import type { MongoRepositoryConfig } from '#/database/mongo';
import { KeyValueStoreProvider } from '../key-value-store.provider';
import { KeyValueStore } from '../key-value.store';
import { MongoKeyValueStoreProvider } from './mongo-key-value-store.provider';
import type { MongoKeyValue } from './mongo-key-value.model';
import { MongoKeyValueStore } from './mongo-key-value.store';

export type MongoKeyValueStoreModuleConfig = {
  defaultKeyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue> | undefined
};

export const mongoKeyValueStoreModuleConfig: MongoKeyValueStoreModuleConfig = {
  defaultKeyValueRepositoryConfig: undefined
};

/**
 * configure mongo queue module
 * @param keyValueRepositoryConfig repository configuration for jobs
 * @param register whether to register for {@link Queue} and {@link QueueProvider}
 */
export function configureMongoKeyValueStore(keyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue>, register: boolean): void {
  mongoKeyValueStoreModuleConfig.defaultKeyValueRepositoryConfig = keyValueRepositoryConfig;

  if (register) {
    container.registerSingleton(KeyValueStoreProvider, { useToken: MongoKeyValueStoreProvider });
    container.registerSingleton(KeyValueStore, { useToken: MongoKeyValueStore });
  }
}
