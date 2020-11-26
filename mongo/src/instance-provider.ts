import { disposer, getLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import type { Type } from '@tstdl/base/types';
import { assertDefined, FactoryMap, isDefined, singleton } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import { connect } from '@tstdl/server/instance-provider';
import * as Mongo from 'mongodb';
import type { MongoEntityRepository } from './entity-repository';
import type { MongoLockEntity } from './lock';
import { MongoLockProvider, MongoLockRepository } from './lock';
import type { MongoDocument } from './model';
import type { Collection } from './types';

type MongoRepositoryStatic<T extends Entity, TDb extends T> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

export type MongoRepositoryConfig<T extends Entity, TDb extends T = T> = {
  databaseName: string,
  collectionName: string,
  type: T,
  databaseType?: TDb
};

let connectionString = '';
let defaultDatabase = '';
let clientOptions: Mongo.MongoClientOptions = { useUnifiedTopology: true, useNewUrlParser: true };

let mongoLogPrefix = 'MONGO';

let repositoryLogPrefix = 'REPO';

let mongoLockRepositoryConfig: MongoRepositoryConfig<MongoLockEntity> | undefined;
let mongoLockProviderLog = 'LOCK';

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
    mongoLockProviderLog?: string
  }
): void {
  connectionString = options.connectionString ?? connectionString;
  defaultDatabase = options.defaultDatabase ?? defaultDatabase;
  clientOptions = options.clientOptions ?? clientOptions;
  mongoLogPrefix = options.mongoLogPrefix ?? mongoLogPrefix;
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
  mongoLockRepositoryConfig = options.mongoLockRepositoryConfig ?? mongoLockRepositoryConfig;
  mongoLockProviderLog = options.mongoLockProviderLog ?? mongoLockProviderLog;
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

export async function getMongoCollection<T extends Entity, TDb extends T>({ databaseName, collectionName }: MongoRepositoryConfig<T, TDb>): Promise<Collection<TDb>> {
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

export async function getMongoRepository<T extends Entity, TDb extends T = T, C extends MongoRepositoryStatic<T, TDb> = MongoRepositoryStatic<T, TDb>>(ctor: C, collectionConfig: MongoRepositoryConfig<T, TDb>): Promise<InstanceType<C>> {
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

// eslint-disable-next-line @typescript-eslint/unified-signatures
export function getMongoRepositoryConfig<T extends Entity, TDb extends T = T>(database: string, collection: string): MongoRepositoryConfig<T, TDb>;
export function getMongoRepositoryConfig<T extends Entity, TDb extends T = T>(collection: string): MongoRepositoryConfig<T, TDb>;
export function getMongoRepositoryConfig<T extends Entity, TDb extends T = T>(databaseOrCollection: string, collection?: string): MongoRepositoryConfig<T, TDb> {
  const databaseName = isDefined(collection) ? databaseOrCollection : defaultDatabase;
  const collectionName = isDefined(collection) ? collection : databaseOrCollection;

  return { databaseName, collectionName, type: undefined as unknown as T, databaseType: undefined as unknown as TDb };
}
