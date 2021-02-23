import type { Logger } from '@tstdl/base/logger';
import type { StringMap } from '@tstdl/base/types';
import { isUndefined } from '@tstdl/base/utils';
import type { KeyValueRepository } from '@tstdl/database';
import { MongoEntityRepository, noopTransformer } from './entity-repository';
import { getNewDocumentId } from './id';
import type { MongoKeyValue } from './model';
import type { Collection, TypedIndexSpecification } from './types';

const indexes: TypedIndexSpecification<MongoKeyValue>[] = [
  { name: 'scope_key', key: { scope: 1, key: 1 }, unique: true }
];

// eslint-disable-next-line @typescript-eslint/no-extraneous-class
export class MongoKeyValueRepository<Scope extends string, KV extends StringMap> implements KeyValueRepository<KV> {
  private readonly repository: MongoEntityRepository<MongoKeyValue>;

  readonly scope: Scope;

  constructor(scope: Scope, collection: Collection<MongoKeyValue>, { logger }: { logger: Logger }) {
    this.scope = scope;

    this.repository = new MongoEntityRepository<MongoKeyValue>(collection, noopTransformer, { indexes, logger, entityName: 'key-value' });
  }

  async initialize(): Promise<void> {
    return this.repository.initialize();
  }

  async get<K extends keyof KV>(key: K): Promise<KV[K] | undefined>;
  async get<K extends keyof KV, D>(key: K, defaultValue: D): Promise<D | KV[K]>;
  async get<K extends keyof KV, D>(key: K, defaultValue?: D): Promise<KV[K] | D | undefined> {
    const item = await this.repository.tryLoadByFilter<MongoKeyValue<KV[K]>>({ scope: this.scope, key: key as string });

    if (isUndefined(item)) {
      return defaultValue;
    }

    return item.value;
  }

  async set<K extends keyof KV>(key: K, value: KV[K]): Promise<void> {
    await this.repository.baseRepository.update({ scope: this.scope, key: key as string }, { $set: { value }, $setOnInsert: { _id: getNewDocumentId() } }, { upsert: true });
  }

  async delete<K extends keyof KV>(key: K): Promise<boolean> {
    return this.repository.deleteByFilter({ scope: this.scope, key: key as string }, true);
  }
}
