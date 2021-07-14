import type { KeyValueStore, KeyValueStoreProvider } from '#/key-value';
import type { StringMap } from '#/types';
import type { MongoKeyValue } from './model';
import type { MongoEntityRepository } from './mongo-entity-repository';
import type { MongoKeyValueRepository } from './mongo-key-value.repository';
import { MongoKeyValueStore } from './mongo-key-value.store';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MongoKeyValueStoreProvider implements KeyValueStoreProvider {
  private readonly keyValueRepository: MongoEntityRepository<MongoKeyValue>;

  constructor(keyValueRepository: MongoKeyValueRepository) {
    this.keyValueRepository = keyValueRepository;
  }

  get<KV extends StringMap>(scope: string): KeyValueStore<KV> {
    return new MongoKeyValueStore(this.keyValueRepository, scope);
  }
}
