import type { KeyValueStore, KeyValueStoreProvider } from '@tstdl/base/key-value';
import type { StringMap } from '@tstdl/base/types';
import type { MongoEntityRepository } from './entity-repository';
import type { MongoKeyValue } from './model';
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
