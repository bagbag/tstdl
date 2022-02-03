import type { Entity } from '#/database';
import type { MongoConnection, MongoRepositoryConfig } from '#/database/mongo';
import { Collection, Database, MongoClient, mongoModuleConfig } from '#/database/mongo';
import { MongoMigrationStateRepository } from '#/database/mongo/migration';
import type { MongoKeyValue } from '#/database/mongo/model';
import type { MongoEntityRepository } from '#/database/mongo/mongo-entity-repository';
import { MongoKeyValueStoreProvider } from '#/database/mongo/mongo-key-value-store.provider';
import { MongoKeyValueRepository } from '#/database/mongo/mongo-key-value.repository';
import type { MongoJob } from '#/database/mongo/queue';
import { MongoQueue, MongoQueueProvider } from '#/database/mongo/queue';
import { Logger } from '#/logger';
import type { MigrationState } from '#/migration';
import type { Type } from '#/types';
import type * as Mongo from 'mongodb';
import { container } from './container';
import { MongoLockProvider } from './lock/mongo';
import type { MongoOidcState, OidcState } from './openid-connect';
import { MongoOidcStateRepository } from './openid-connect';
import type { QueueConfig } from './queue';
import { FactoryMap } from './utils/factory-map';
import { singleton } from './utils/singleton';
import { assertDefined } from './utils/type-guards';

type MongoRepositoryStatic<T extends Entity, TDb extends Entity> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

const singletonScope = Symbol('singletons');
const databaseRepositorySingletonScopes = new FactoryMap<string, symbol>(() => Symbol('database-repository-singletons'));

let mongoLogPrefix = 'MONGO';

let repositoryLogPrefix = 'REPO';

let mongoMigrationStateRepositoryConfig: MongoRepositoryConfig<MigrationState> | undefined;

let mongoKeyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue> | undefined;
let mongoOidcStateRepositoryConfig: MongoRepositoryConfig<OidcState, MongoOidcState> | undefined;

export function configureMongoInstanceProvider(
  options: {
    mongoLogPrefix?: string,
    repositoryLogPrefix?: string,
    mongoMigrationStateRepositoryConfig?: MongoRepositoryConfig<MigrationState>,
    mongoKeyValueRepositoryConfig?: MongoRepositoryConfig<MongoKeyValue>,
    mongoOidcStateRepositoryConfig?: MongoRepositoryConfig<OidcState, MongoOidcState>
  }
): void {
  mongoLogPrefix = options.mongoLogPrefix ?? mongoLogPrefix;
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
  mongoMigrationStateRepositoryConfig = options.mongoMigrationStateRepositoryConfig ?? mongoMigrationStateRepositoryConfig;
  mongoKeyValueRepositoryConfig = options.mongoKeyValueRepositoryConfig ?? mongoKeyValueRepositoryConfig;
  mongoOidcStateRepositoryConfig = options.mongoOidcStateRepositoryConfig ?? mongoOidcStateRepositoryConfig;
}

export async function getMongoClient(connection?: MongoConnection): Promise<Mongo.MongoClient> {
  return container.resolveAsync(MongoClient, connection);
}

export async function getMongoDatabase(database: string | undefined = mongoModuleConfig.defaultDatabase, connection: MongoConnection = mongoModuleConfig.defaultConnection): Promise<Mongo.Db> {
  return container.resolveAsync(Database, { connection, database });
}

export async function getMongoCollection<T extends Entity, TDb extends Entity>(config: MongoRepositoryConfig<T, TDb>): Promise<Collection<TDb>> {
  return container.resolveAsync(Collection, config) as Promise<Collection<TDb>>;
}

export async function getMongoRepository<T extends Entity, TDb extends Entity = T, C extends MongoRepositoryStatic<T, TDb> = MongoRepositoryStatic<T, TDb>>(ctor: C, collectionConfig: MongoRepositoryConfig<T, TDb>): Promise<InstanceType<C>> {
  const key = JSON.stringify(collectionConfig);
  const scope = databaseRepositorySingletonScopes.get(key);

  return singleton(scope, ctor, async () => {
    const logger = await container.resolveAsync(Logger, repositoryLogPrefix);
    const collection = await getMongoCollection(collectionConfig);
    const repository = new ctor(collection, logger) as InstanceType<C>;

    await repository.initialize();

    return repository;
  });
}

export async function getMongoLockProvider(): Promise<MongoLockProvider> {
  return container.resolveAsync(MongoLockProvider);
}

export async function getMongoMigrationStateRepository(): Promise<MongoMigrationStateRepository> {
  return singleton(singletonScope, MongoMigrationStateRepository, async () => {
    assertDefined(mongoMigrationStateRepositoryConfig, 'mongoMigrationStateRepositoryConfig must be configured');
    return getMongoRepository(MongoMigrationStateRepository, mongoMigrationStateRepositoryConfig);
  });
}

export async function getMongoKeyValueRepository(): Promise<MongoKeyValueRepository> {
  return singleton(singletonScope, MongoKeyValueRepository, async () => {
    assertDefined(mongoKeyValueRepositoryConfig, 'mongoKeyValueRepositoryConfig must be configured');
    return getMongoRepository(MongoKeyValueRepository, mongoKeyValueRepositoryConfig);
  });
}

export async function getMongoOidcStateRepository(): Promise<MongoOidcStateRepository> {
  return singleton(singletonScope, MongoOidcStateRepository, async () => {
    assertDefined(mongoOidcStateRepositoryConfig, 'mongoOidcStateRepositoryConfig must be configured');
    return getMongoRepository(MongoOidcStateRepository, mongoOidcStateRepositoryConfig);
  });
}

export async function getMongoKeyValueStoreProvider(): Promise<MongoKeyValueStoreProvider> {
  return singleton(singletonScope, MongoKeyValueStoreProvider, async () => {
    const repository = await getMongoKeyValueRepository();
    return new MongoKeyValueStoreProvider(repository);
  });
}

export async function getMongoQueueProvider(config: MongoRepositoryConfig<MongoJob>): Promise<MongoQueueProvider> {
  return container.resolveAsync(MongoQueueProvider, config);
}

export async function getMongoQueue<T>(key: string, config?: QueueConfig): Promise<MongoQueue<T>> {
  return container.resolveAsync(MongoQueue, { key, ...config }) as Promise<MongoQueue<T>>;
}
