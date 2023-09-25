import type { MongoRepositoryConfig } from '#/database/mongo/index.js';
import { Injector } from '#/injector/injector.js';
import { KeyValueStoreProvider } from '../key-value-store.provider.js';
import { KeyValueStore } from '../key-value.store.js';
import { MongoKeyValueStoreProvider } from './mongo-key-value-store.provider.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';
import { MongoKeyValueStore } from './mongo-key-value.store.js';
import { DEFAULT_KEY_VALUE_REPOSITORY_CONFIG } from './tokens.js';

/**
 * configure mongo queue module
 * @param keyValueRepositoryConfig repository configuration for jobs
 * @param register whether to register for {@link Queue} and {@link QueueProvider}
 */
export function configureMongoKeyValueStore(keyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue>, register: boolean = true): void {
  Injector.register(DEFAULT_KEY_VALUE_REPOSITORY_CONFIG, { useValue: keyValueRepositoryConfig });

  if (register) {
    Injector.registerSingleton(KeyValueStoreProvider, { useToken: MongoKeyValueStoreProvider });
    Injector.registerSingleton(KeyValueStore, { useToken: MongoKeyValueStore });
  }
}
