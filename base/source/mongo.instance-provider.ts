import type { Entity } from '#/database';
import { connect, disposer, getLogger } from '#/instance-provider';
import type { Logger } from '#/logger';
import type { MigrationState } from '#/migration';
import type { Type } from '#/types';
import { assertDefined, FactoryMap, singleton } from '#/utils';
import * as Mongo from 'mongodb';
import { MongoMigrationStateRepository } from './database/mongo/migration';
import type { MongoDocument, MongoKeyValue } from './database/mongo/model';
import type { MongoEntityRepository } from './database/mongo/mongo-entity-repository';
import { MongoKeyValueStoreProvider } from './database/mongo/mongo-key-value-store.provider';
import { MongoKeyValueRepository } from './database/mongo/mongo-key-value.repository';
import type { MongoJob } from './database/mongo/queue';
import { MongoJobRepository, MongoQueue } from './database/mongo/queue';
import type { Collection } from './database/mongo/types';
import type { MongoLockEntity } from './lock/mongo';
import { MongoLockProvider, MongoLockRepository } from './lock/mongo';

type MongoRepositoryStatic<T extends Entity, TDb extends Entity> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

export type MongoConnection = {
  url: string
} & Mongo.MongoClientOptions;

export type MongoRepositoryConfig<T extends Entity, TDb extends Entity = T> = {
  connection: MongoConnection,
  database: string,
  collection: string,
  type: T,
  databaseType?: TDb
};

export type MongoQueueConfig<T> = {
  repositoryConfig: MongoRepositoryConfig<MongoJob<T>>,
  processTimeout: number,
  maxTries: number
};

const singletonScope = Symbol('singletons');
const clientSingletonScope = Symbol('client singletons');
const databaseSingletonScope = Symbol('database singletons');
const databaseCollectionSingletonScopes = new FactoryMap<string, symbol>(() => Symbol('database-collection-singletons'));

let defaultDatabase = '';
let defaultConnection: MongoConnection = { url: 'mongodb://localhost:27017' };

let mongoLogPrefix = 'MONGO';

let repositoryLogPrefix = 'REPO';

let mongoLockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity> | undefined;
let mongoLockProviderLog = 'LOCK';

let mongoMigrationStateRepositoryConfig: MongoRepositoryConfig<MigrationState> | undefined;

let mongoKeyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue> | undefined;

export function configureMongoInstanceProvider(
  options: {
    connectionString?: string,
    defaultDatabase?: string,
    defaultConnection?: MongoConnection,
    mongoLogPrefix?: string,
    repositoryLogPrefix?: string,
    mongoLockRepositoryConfig?: MongoRepositoryConfig<MongoLockEntity>,
    mongoLockProviderLog?: string,
    mongoMigrationStateRepositoryConfig?: MongoRepositoryConfig<MigrationState>,
    mongoKeyValueRepositoryConfig?: MongoRepositoryConfig<MongoKeyValue>
  }
): void {
  defaultDatabase = options.defaultDatabase ?? defaultDatabase;
  defaultConnection = options.defaultConnection ?? defaultConnection;
  mongoLogPrefix = options.mongoLogPrefix ?? mongoLogPrefix;
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
  mongoLockRepositoryConfig = options.mongoLockRepositoryConfig ?? mongoLockRepositoryConfig;
  mongoLockProviderLog = options.mongoLockProviderLog ?? mongoLockProviderLog;
  mongoMigrationStateRepositoryConfig = options.mongoMigrationStateRepositoryConfig ?? mongoMigrationStateRepositoryConfig;
  mongoKeyValueRepositoryConfig = options.mongoKeyValueRepositoryConfig ?? mongoKeyValueRepositoryConfig;
}

export async function getMongoClient(connection?: MongoConnection): Promise<Mongo.MongoClient> {
  const combinedConnection = { ...defaultConnection, ...connection };
  const key = JSON.stringify(combinedConnection);

  return singleton(clientSingletonScope, key, async () => {
    const logger = getLogger(mongoLogPrefix);

    const logFunction: Mongo.LoggerFunction = (message: any, ...parameters: any) => {
      const debugLogMessage = JSON.stringify({ message, parameters }, undefined, 2);
      logger.verbose(debugLogMessage);
    };

    Mongo.Logger.setCurrentLogger(logFunction);

    const mongoClient: Mongo.MongoClient = new Mongo.MongoClient(combinedConnection.url, combinedConnection);

    mongoClient
      .on('fullsetup', () => logger.verbose('connection setup'))
      .on('reconnect', () => logger.warn('reconnected'))
      .on('timeout', () => logger.warn('connection timed out'))
      .on('close', () => logger.verbose('connection closed'));

    disposer.add(async () => mongoClient.close());

    await connect('mongo', async () => mongoClient.connect(), logger);

    return mongoClient;
  });
}

export async function getMongoDatabase(databaseName: string = defaultDatabase, connection?: MongoConnection): Promise<Mongo.Db> {
  const key = JSON.stringify({ databaseName, connection });

  return singleton(databaseSingletonScope, key, async () => {
    const mongo = await getMongoClient(connection);
    return mongo.db(defaultDatabase);
  });
}

export async function getMongoCollection<T extends Entity, TDb extends Entity>({ connection, database: databaseName, collection: collectionName }: MongoRepositoryConfig<T, TDb>): Promise<Collection<TDb>> {
  const scope = databaseCollectionSingletonScopes.get(JSON.stringify({ connection, databaseName }));

  return singleton(scope, collectionName, async () => {
    const database = await getMongoDatabase(databaseName);
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == collectionName) {
        return collection as unknown as Collection<TDb>;
      }
    }

    return database.createCollection<MongoDocument<TDb>>(collectionName);
  });
}

export async function getMongoRepository<T extends Entity, TDb extends Entity = T, C extends MongoRepositoryStatic<T, TDb> = MongoRepositoryStatic<T, TDb>>(ctor: C, collectionConfig: MongoRepositoryConfig<T, TDb>): Promise<InstanceType<C>> {
  return singleton(singletonScope, ctor, async () => {
    const logger = getLogger(repositoryLogPrefix);
    const collection = await getMongoCollection(collectionConfig);
    const repository = new ctor(collection, logger) as InstanceType<C>;

    await repository.initialize();

    return repository;
  });
}

export async function getMongoLockProvider(): Promise<MongoLockProvider> {
  return singleton(singletonScope, MongoLockProvider, async () => {
    assertDefined(mongoLockRepositoryConfig, 'mongoLockRepositoryConfig must be configured');

    const repository = await getMongoRepository(MongoLockRepository, mongoLockRepositoryConfig);
    const logger = getLogger(mongoLockProviderLog);

    return new MongoLockProvider(repository, logger);
  });
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

export async function getMongoKeyValueStoreProvider(): Promise<MongoKeyValueStoreProvider> {
  return singleton(singletonScope, MongoKeyValueStoreProvider, async () => {
    const repository = await getMongoKeyValueRepository();
    return new MongoKeyValueStoreProvider(repository);
  });
}

export async function getMongoQueue<T>(config: MongoQueueConfig<T>): Promise<MongoQueue<T>> {
  const repository = await getMongoRepository(MongoJobRepository as Type<MongoJobRepository<T>>, config.repositoryConfig);
  return new MongoQueue(repository, config.processTimeout, config.maxTries);
}

// eslint-disable-next-line @typescript-eslint/unified-signatures
export function getMongoRepositoryConfig<T extends Entity, TDb extends Entity = T>({ connection = defaultConnection, database = defaultDatabase, collection }: { connection?: MongoConnection, database?: string, collection: string }): MongoRepositoryConfig<T, TDb> {
  return { connection, database, collection, type: undefined as unknown as T, databaseType: undefined as unknown as TDb };
}

export function getMongoQueueConfig<T>(repositoryConfig: MongoRepositoryConfig<MongoJob<T>>, processTimeout: number, maxTries: number): MongoQueueConfig<T> {
  return { repositoryConfig, processTimeout, maxTries };
}
