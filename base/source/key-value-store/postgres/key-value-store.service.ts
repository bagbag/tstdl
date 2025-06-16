import { Singleton, injectArgument, provide, type resolveArgumentType } from '#/injector/index.js';
import { DatabaseConfig, Transactional } from '#/orm/server/index.js';
import { EntityRepositoryConfig, injectRepository } from '#/orm/server/repository.js';
import type { Record } from '#/types.js';
import { objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isDefined, isUndefined } from '#/utils/type-guards.js';
import { KeyValueStore, type KeyValueStoreArgument } from '../key-value.store.js';
import { KeyValue } from './models/index.js';
import { PostgresKeyValueStoreModuleConfig } from './module.js';

@Singleton({
  providers: [
    provide(EntityRepositoryConfig, { useValue: { schema: 'key_value_store' } }),
    { provide: DatabaseConfig, useFactory: (_, context) => context.resolve(PostgresKeyValueStoreModuleConfig).database ?? context.resolve(DatabaseConfig, undefined, { skipSelf: true }) },
  ],
})
export class PostgresKeyValueStore<KV extends Record<string, unknown>> extends Transactional implements KeyValueStore<KV> {
  readonly #keyValueRepository = injectRepository(KeyValue);

  readonly module = assertDefinedPass(injectArgument(this), 'KeyValueStore module must be passed as argument.');

  declare readonly [resolveArgumentType]: KeyValueStoreArgument;

  async get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  async get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<KV[K] | D>;
  async get(key: unknown, defaultValue?: unknown): Promise<unknown> {
    const result = await this.#keyValueRepository.tryLoadByQuery({ module: this.module, key: key as string });

    if (isUndefined(result)) {
      return defaultValue;
    }

    return result.value;
  }

  async set<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
    await this.#keyValueRepository.upsert(['module', 'key'], { module: this.module, key: key as string, value });
  }

  async getOrSet<K extends keyof KV>(key: K, value: KV[K]): Promise<KV[K]> {
    const keyValue = await this.#keyValueRepository.transaction(async (tx) => {
      const keyValue = await this.#keyValueRepository.withTransaction(tx).insertIfNotExists(['module', 'key'], { module: this.module, key: key as string, value });

      if (isDefined(keyValue)) {
        return keyValue;
      }

      return await this.#keyValueRepository.withTransaction(tx).loadByQuery({ module: this.module, key: key as string });
    });

    return keyValue.value as KV[K];
  }

  async setMany(keyValues: Partial<KV>): Promise<void> {
    const entries = objectEntries(keyValues).map(([key, value]) => ({
      module: this.module,
      key: key as string,
      value,
    }));

    await this.#keyValueRepository.upsertMany(['module', 'key'], entries);
  }

  async delete(key: keyof KV): Promise<boolean> {
    const result = await this.#keyValueRepository.tryDeleteByQuery({ module: this.module, key: key as string });
    return isDefined(result);
  }

  async deleteMany(keys: (keyof KV)[]): Promise<void> {
    await this.#keyValueRepository.deleteManyByQuery({ module: this.module, key: { $in: keys as string[] } });
  }

  async clear(): Promise<void> {
    await this.#keyValueRepository.hardDeleteManyByQuery({ module: this.module });
  }
}
