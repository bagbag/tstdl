import { injectArg, singleton } from '#/container';
import { getNewId } from '#/database';
import type { UpdateFilter } from '#/database/mongo';
import { KeyValueStore } from '#/key-value-store';
import type { StringMap } from '#/types';
import { currentTimestamp } from '#/utils/date-time';
import { objectEntries } from '#/utils/object/object';
import { assertStringPass, isUndefined } from '#/utils/type-guards';
import type { MongoKeyValue } from './mongo-key-value.model';
import { MongoKeyValueRepository } from './mongo-key-value.repository';

@singleton()
export class MongoKeyValueStore<KV extends StringMap> extends KeyValueStore<KV> {
  private readonly keyValueRepository: MongoKeyValueRepository;

  constructor(
    keyValueRepository: MongoKeyValueRepository,

    @injectArg((argument) => assertStringPass(argument, 'key-value store argument missing (module)'))
    module: string
  ) {
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
      $setOnInsert: { _id: getNewId() }
    };

    await this.keyValueRepository.baseRepository.update({ module: this.module, key: key as string }, update, { upsert: true });
  }

  async setMany(keyValues: Partial<KV>): Promise<void> {
    const timestamp = currentTimestamp();

    const bulk = this.keyValueRepository.baseRepository.bulk();

    for (const [key, value] of objectEntries<StringMap>(keyValues)) {
      const update: UpdateFilter<MongoKeyValue> = {
        $set: { value, updated: timestamp },
        $setOnInsert: { _id: getNewId() }
      };

      bulk.update({ module: this.module, key }, update, { upsert: true });
    }

    await bulk.execute();
  }

  async delete(key: keyof KV): Promise<boolean> {
    return this.keyValueRepository.deleteByFilter({ module: this.module, key: key as string });
  }

  async deleteMany(keys: (keyof KV)[]): Promise<void> {
    await this.keyValueRepository.deleteManyByFilter({ module: this.module, key: { $in: keys as string[] } });
  }

  async clear(): Promise<void> {
    await this.keyValueRepository.deleteManyByFilter({ module: this.module });
  }
}
