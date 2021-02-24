import type { KeyValueStore } from '@tstdl/base/key-value';
import type { StringMap } from '@tstdl/base/types';
import { isUndefined } from '@tstdl/base/utils';
import type { MongoEntityRepository } from './entity-repository';
import { getNewDocumentId } from './id';
import type { MongoKeyValueRepository } from './mongo-key-value.repository';
import type { MongoKeyValue } from './model';

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MongoKeyValueStore<KV extends StringMap> implements KeyValueStore<KV> {
  private readonly keyValueRepository: MongoEntityRepository<MongoKeyValue>;

  readonly scope: string;

  constructor(keyValueRepository: MongoKeyValueRepository, scope: string) {
    this.keyValueRepository = keyValueRepository;
    this.scope = scope;
  }

  async get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  async get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<D | KV[K]>;
  async get<K extends keyof KV, D>(key: K, defaultValue?: D): Promise<KV[K] | D | undefined> {
    const item = await this.keyValueRepository.baseRepository.tryLoadByFilter<MongoKeyValue<KV[K]>>({ scope: this.scope, key: key as string });

    if (isUndefined(item)) {
      return defaultValue;
    }

    return item.value;
  }

  async set<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
    await this.keyValueRepository.baseRepository.update({ scope: this.scope, key: key as string }, { $set: { value }, $setOnInsert: { _id: getNewDocumentId() } }, { upsert: true });
  }

  async delete<K extends keyof KV>(key: K): Promise<boolean> {
    return this.keyValueRepository.baseRepository.deleteByFilter({ scope: this.scope, key: key as string }, true);
  }
}
