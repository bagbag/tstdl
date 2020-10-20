import type { Logger } from '@tstdl/base/logger';
import type { StringMap } from '@tstdl/base/types';
import type { KeyValueRepository } from '@tstdl/database';
import { MongoEntityRepository, noopTransformer } from './entity-repository';
import { getNewDocumentId } from './id';
import type { KeyValue } from './model';
import type { Collection, TypedIndexSpecification } from './types';

const indexes: TypedIndexSpecification<KeyValue>[] = [
  { name: 'module_key', key: { module: 1, key: 1 }, unique: true }
];

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MongoKeyValueRepository<Module extends string, KV extends StringMap> implements KeyValueRepository<KV> {
  private readonly repository: MongoEntityRepository<KeyValue>;

  readonly module: Module;

  constructor(module: Module, collection: Collection<KeyValue>, { logger }: { logger: Logger }) {
    this.module = module;

    this.repository = new MongoEntityRepository<KeyValue>(collection, noopTransformer, { indexes, logger, entityName: 'key-value' });
  }

  async initialize(): Promise<void> {
    return this.repository.initialize();
  }

  async get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  async get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<D | KV[K]>;
  async get<K extends keyof KV, D>(key: K, defaultValue?: D): Promise<KV[K] | D | undefined> {
    const item = await this.repository.tryLoadByFilter<KeyValue<KV[K]>>({ module: this.module, key: key as string });

    if (item == undefined) {
      return defaultValue;
    }

    return item.value;
  }

  async set<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
    await this.repository.baseRepository.update({ module: this.module, key: key as string }, { $set: { value }, $setOnInsert: { _id: getNewDocumentId() } }, { upsert: true });
  }

  async delete<K extends keyof KV>(key: K): Promise<boolean> {
    return this.repository.deleteByFilter({ module: this.module, key: key as string });
  }
}
