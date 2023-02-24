import { singleton } from '#/container/index.js';
import type { KeyValueStore, KeyValueStoreProvider } from '#/key-value-store/index.js';
import type { StringMap } from '#/types.js';
import { MongoKeyValueRepository } from './mongo-key-value.repository.js';
import { MongoKeyValueStore } from './mongo-key-value.store.js';

@singleton()
export class MongoKeyValueStoreProvider implements KeyValueStoreProvider {
  private readonly keyValueRepository: MongoKeyValueRepository;

  constructor(keyValueRepository: MongoKeyValueRepository) {
    this.keyValueRepository = keyValueRepository;
  }

  get<KV extends StringMap>(module: string): KeyValueStore<KV> {
    return new MongoKeyValueStore(this.keyValueRepository, module);
  }
}
