import { disposer, getLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import type { StringMap, Type } from '@tstdl/base/types';
import { assertDefined, FactoryMap, isDefined, singleton } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import { connect } from '@tstdl/server/instance-provider';
import type { MigrationState } from '@tstdl/server/migration';
import * as Mongo from 'mongodb';
import type { MongoEntityRepository } from './entity-repository';
import { MongoKeyValueStore } from './key-value.store';
import type { MongoLockEntity } from './lock';
import { MongoLockProvider, MongoLockRepository } from './lock';
import { MongoMigrationStateRepository } from './migration';
import type { MongoDocument, MongoKeyValue } from './model';
import { MongoKeyValueRepository } from './mongo-key-value.repository';
import type { MongoJob } from './queue';
import { MongoJobRepository, MongoQueue } from './queue';
import type { Collection } from './types';

type MongoRepositoryStatic<T extends Entity, TDb extends Entity> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

export type MongoRepositoryConfig<T extends Entity, TDb extends Entity = T> = {
  databaseName: string,
  collectionName: string,
  type: T,
  databaseType?: TDb
};

export type MongoQueueConfig<T> = {
  repositoryConfig: MongoRepositoryConfig<MongoJob<T>>,
  processTimeout: number,
  maxTries: number
};

let connectionString = '';
let defaultDatabase = '';
let clientOptions: Mongo.MongoClientOptions = { useUnifiedTopology: true, useNewUrlParser: true };

let mongoLogPrefix = 'MONGO';

let repositoryLogPrefix = 'REPO';

let mongoLockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity> | undefined;
let mongoLockProviderLog = 'LOCK';

let mongoMigrationStateRepositoryConfig: MongoRepositoryConfig<MigrationState> | undefined;

let mongoKeyValueRepositoryConfig: MongoRepositoryConfig<MongoKeyValue> | undefined;

const databaseKeys = new FactoryMap<string, symbol>(() => Symbol('database'));
const collectionKeys = new FactoryMap<string, FactoryMap<string, symbol>>(() => new FactoryMap(() => Symbol('collection')));

export function configureMongoInstanceProvider(
  options: {
    connectionString?: string,
    defaultDatabase?: string,
    clientOptions?: Mongo.MongoClientOptions,
    mongoLogPrefix?: string,
    repositoryLogPrefix?: string,
    mongoLockRepositoryConfig?: MongoRepositoryConfig<MongoLockEntity>,
    mongoLockProviderLog?: string,
    mongoMigrationStateRepositoryConfig?: MongoRepositoryConfig<MigrationState>,
    mongoKeyValueRepositoryConfig?: MongoRepositoryConfig<MongoKeyValue>
  }
): void {
  connectionString = options.connectionString ?? connectionString;
  defaultDatabase = options.defaultDatabase ?? defaultDatabase;
  clientOptions = options.clientOptions ?? clientOptions;
  mongoLogPrefix = options.mongoLogPrefix ?? mongoLogPrefix;
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
  mongoLockRepositoryConfig = options.mongoLockRepositoryConfig ?? mongoLockRepositoryConfig;
  mongoLockProviderLog = options.mongoLockProviderLog ?? mongoLockProviderLog;
  mongoMigrationStateRepositoryConfig = options.mongoMigrationStateRepositoryConfig ?? mongoMigrationStateRepositoryConfig;
}

export async function getMongo(): Promise<Mongo.MongoClient> {
  return singleton(Mongo.MongoClient, async () => {
    const logger = getLogger(mongoLogPrefix);

    const logFunction: Mongo.log = (message?: string, state?: Mongo.LoggerState) => {
      const debugLogMessage = JSON.stringify({ message, state }, undefined, 2);
      logger.verbose(debugLogMessage);
    };

    Mongo.Logger.setCurrentLogger(logFunction);

    const mongoClient: Mongo.MongoClient = new Mongo.MongoClient(connectionString, clientOptions);

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

export async function getMongoDatabase(databaseName: string = defaultDatabase): Promise<Mongo.Db> {
  const key = databaseKeys.get(databaseName);

  return singleton(key, async () => {
    const mongo = await getMongo();
    return mongo.db(defaultDatabase);
  });
}

export async function getMongoCollection<T extends Entity, TDb extends Entity>({ databaseName, collectionName }: MongoRepositoryConfig<T, TDb>): Promise<Collection<TDb>> {
  const key = collectionKeys.get(databaseName).get(collectionName);

  return singleton(key, async () => {
    const database = await getMongoDatabase(databaseName);
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == collectionName) {
        return collection;
      }
    }

    return database.createCollection<MongoDocument<TDb>>(collectionName);
  });
}

export async function getMongoRepository<T extends Entity, TDb extends Entity = T, C extends MongoRepositoryStatic<T, TDb> = MongoRepositoryStatic<T, TDb>>(ctor: C, collectionConfig: MongoRepositoryConfig<T, TDb>): Promise<InstanceType<C>> {
  return singleton(ctor, async () => {
    const logger = getLogger(repositoryLogPrefix);
    const collection = await getMongoCollection(collectionConfig);
    const repository = new ctor(collection, logger) as InstanceType<C>;

    await repository.initialize();

    return repository;
  });
}

export async function getMongoLockProvider(): Promise<MongoLockProvider> {
  return singleton(MongoLockProvider, async () => {
    assertDefined(mongoLockRepositoryConfig, 'mongoLockRepositoryConfig must be configured');

    const repository = await getMongoRepository(MongoLockRepository, mongoLockRepositoryConfig);
    const logger = getLogger(mongoLockProviderLog);

    return new MongoLockProvider(repository, logger);
  });
}

export async function getMongoMigrationStateRepository(): Promise<MongoMigrationStateRepository> {
  return singleton(MongoMigrationStateRepository, async () => {
    assertDefined(mongoMigrationStateRepositoryConfig, 'mongoMigrationStateRepositoryConfig must be configured');
    return getMongoRepository(MongoMigrationStateRepository, mongoMigrationStateRepositoryConfig);
  });
}

export async function getMongoKeyValueRepository(): Promise<MongoKeyValueRepository> {
  return singleton(MongoKeyValueRepository, async () => {
    assertDefined(mongoKeyValueRepositoryConfig, 'mongoKeyValueRepositoryConfig must be configured');
    return getMongoRepository(MongoKeyValueRepository, mongoKeyValueRepositoryConfig);
  });
}

export async function getMongoKeyValueStore<KV extends StringMap>(scope: string): Promise<MongoKeyValueStore<KV>> {
  return singleton(MongoKeyValueStore, async () => {
    const repository = await getMongoKeyValueRepository();
    return new MongoKeyValueStore(repository, scope);
  });
}

export async function getMongoQueue<T>(config: MongoQueueConfig<T>): Promise<MongoQueue<T>> {
  const repository = await getMongoRepository(MongoJobRepository as Type<MongoJobRepository<T>>, config.repositoryConfig);
  return new MongoQueue(repository, config.processTimeout, config.maxTries);
}

// eslint-disable-next-line @typescript-eslint/unified-signatures
export function getMongoRepositoryConfig<T extends Entity, TDb extends Entity = T>(database: string, collection: string): MongoRepositoryConfig<T, TDb>;
export function getMongoRepositoryConfig<T extends Entity, TDb extends Entity = T>(collection: string): MongoRepositoryConfig<T, TDb>;
export function getMongoRepositoryConfig<T extends Entity, TDb extends Entity = T>(databaseOrCollection: string, collection?: string): MongoRepositoryConfig<T, TDb> {
  const databaseName = isDefined(collection) ? databaseOrCollection : defaultDatabase;
  const collectionName = isDefined(collection) ? collection : databaseOrCollection;

  return { databaseName, collectionName, type: undefined as unknown as T, databaseType: undefined as unknown as TDb };
}

export function getMongoQueueConfig<T>(repositoryConfig: MongoRepositoryConfig<MongoJob<T>>, processTimeout: number, maxTries: number): MongoQueueConfig<T> {
  return { repositoryConfig, processTimeout, maxTries };
}
