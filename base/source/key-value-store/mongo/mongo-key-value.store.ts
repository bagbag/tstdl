import { getNewId } from '#/database/index.js';
import type { UpdateFilter } from '#/database/mongo/index.js';
import { Singleton } from '#/injector/index.js';
import { KeyValueStore } from '#/key-value-store/index.js';
import type { StringMap } from '#/types/index.js';
import { currentTimestamp } from '#/utils/date-time.js';
import { objectEntries } from '#/utils/object/object.js';
import { assertString, isUndefined } from '#/utils/type-guards.js';
import { MongoKeyValueStoreProvider } from './mongo-key-value-store.provider.js';
import type { MongoKeyValue } from './mongo-key-value.model.js';
import { MongoKeyValueRepository } from './mongo-key-value.repository.js';

@Singleton({
  provider: {
    useFactory: (argument, context) => {
      const provider = context.resolve(MongoKeyValueStoreProvider);
      assertString(argument, 'Missing or invalid argument (KV-Store module)');

      return provider.get(argument);
    },
  },
})
export class MongoKeyValueStore<KV extends StringMap> extends KeyValueStore<KV> {
  private readonly keyValueRepository: MongoKeyValueRepository;

  constructor(keyValueRepository: MongoKeyValueRepository, module: string) {
    super(module);

    this.keyValueRepository = keyValueRepository;
  }

  async get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  async get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<D | KV[K]>;
  async get<K extends keyof KV, D>(key: K, defaultValue?: D): Promise<KV[K] | D | undefined> {
    const item = await this.keyValueRepository.baseRepository.tryLoadByFilter<MongoKeyValue<KV[K]>>({ module: this.module, key: key as string });

    if (isUndefined(item)) {
      return defaultValue;
    }

    return item.value;
  }

  async set<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
    const timestamp = currentTimestamp();

    const update: UpdateFilter<MongoKeyValue> = {
      $set: { value, updated: timestamp },
      $setOnInsert: { _id: getNewId() },
    };

    await this.keyValueRepository.baseRepository.update({ module: this.module, key: key as string }, update, { upsert: true });
  }

  async getOrSet<K extends keyof KV>(key: K, value: KV[K]): Promise<KV[K]> {
    await this.keyValueRepository.baseRepository.insertIfNotExistsByFilter({
      module: this.module,
      key: key as string,
      value,
    }, { id: getNewId(), module: this.module, key: key as string, value, updated: currentTimestamp() });

    const result = await this.get(key);
    return result as KV[K];
  }

  async setMany(keyValues: Partial<KV>): Promise<void> {
    const timestamp = currentTimestamp();

    const bulk = this.keyValueRepository.baseRepository.bulk();

    for (const [key, value] of objectEntries<StringMap>(keyValues)) {
      const update: UpdateFilter<MongoKeyValue> = {
        $set: { value, updated: timestamp },
        $setOnInsert: { _id: getNewId() },
      };

      bulk.update({ module: this.module, key }, update, { upsert: true });
    }

    await bulk.execute();
  }

  async delete(key: keyof KV): Promise<boolean> {
    return await this.keyValueRepository.deleteByFilter({ module: this.module, key: key as string });
  }

  async deleteMany(keys: (keyof KV)[]): Promise<void> {
    await this.keyValueRepository.deleteManyByFilter({ module: this.module, key: { $in: keys as string[] } });
  }

  async clear(): Promise<void> {
    await this.keyValueRepository.deleteManyByFilter({ module: this.module });
  }
}
