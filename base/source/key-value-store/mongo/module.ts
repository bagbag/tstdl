import { container } from '#/container/index.js';
import type { MongoRepositoryConfig } from '#/database/mongo/index.js';
import { KeyValueStoreProvider } from '../key-value-store.provider.js';
import { KeyValueStore } from '../key-value.store.js';
import { MongoKeyValueStoreProvider } from './mongo-key-value-store.provider.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';
import { MongoKeyValueStore } from './mongo-key-value.store.js';

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
export function configureMongoKeyValueStore(keyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue>, register: boolean = true): void {
  mongoKeyValueStoreModuleConfig.defaultKeyValueRepositoryConfig = keyValueRepositoryConfig;

  if (register) {
    container.registerSingleton(KeyValueStoreProvider, { useToken: MongoKeyValueStoreProvider });
    container.registerSingleton(KeyValueStore, { useToken: MongoKeyValueStore });
  }
}
