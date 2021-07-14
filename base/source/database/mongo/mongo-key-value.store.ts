import type { KeyValueStore } from '#/key-value';
import type { StringMap } from '#/types';
import { currentTimestamp, isUndefined } from '#/utils';
import { getNewId } from '#/database';
import type { MongoKeyValue } from './model';
import type { MongoEntityRepository } from './mongo-entity-repository';
import type { MongoKeyValueRepository } from './mongo-key-value.repository';
import type { UpdateFilter } from './types';

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
    const timestamp = currentTimestamp();

    const update: UpdateFilter<MongoKeyValue> = {
      $set: { value, updated: timestamp },
      $setOnInsert: { _id: getNewId() }
    };

    await this.keyValueRepository.baseRepository.update({ scope: this.scope, key: key as string }, update, { upsert: true });
  }

  async delete<K extends keyof KV>(key: K): Promise<boolean> {
    return this.keyValueRepository.baseRepository.deleteByFilter({ scope: this.scope, key: key as string });
  }
}
