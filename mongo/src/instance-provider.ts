import { disposer, getLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import type { Type } from '@tstdl/base/types';
import { singleton } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import { connect } from '@tstdl/server/instance-provider';
import * as Mongo from 'mongodb';
import type { MongoEntityRepository } from './entity-repository';
import type { MongoDocument } from './model';
import type { Collection } from './types';

type MongoRepositoryStatic<T extends Entity, TDb extends T> = Type<MongoEntityRepository<T, TDb>, [Collection<TDb>, Logger]>;

export type MongoRepositoryConfig<T extends Entity, TDb extends T> = {
  name: string,
  type: T,
  databaseType?: TDb
};

let mongoConnectionString = '';
let mongoDatabase = '';
let mongoClientOptions: Mongo.MongoClientOptions = { useUnifiedTopology: true, useNewUrlParser: true };
let mongoLogPrefix = 'MONGO';

let repositoryLogPrefix = 'REPO';

export function configureMongoInstanceProvider(
  options: {
    mongoConnectionString?: string,
    mongoDatabase?: string,
    mongoClientOptions?: Mongo.MongoClientOptions,
    mongoLogPrefix?: string,
    repositoryLogPrefix?: string
  }
): void {
  mongoConnectionString = options.mongoConnectionString ?? mongoConnectionString;
  mongoDatabase = options.mongoDatabase ?? mongoDatabase;
  mongoClientOptions = options.mongoClientOptions ?? mongoClientOptions;
  mongoLogPrefix = options.mongoLogPrefix ?? mongoLogPrefix;
  repositoryLogPrefix = options.repositoryLogPrefix ?? repositoryLogPrefix;
}

export async function getMongo(): Promise<Mongo.MongoClient> {
  return singleton(Mongo.MongoClient, async () => {
    const logger = getLogger(mongoLogPrefix);

    const logFunction: Mongo.log = (message?: string, state?: Mongo.LoggerState) => {
      const debugLogMessage = JSON.stringify({ message, state }, undefined, 2);
      logger.verbose(debugLogMessage);
    };

    Mongo.Logger.setCurrentLogger(logFunction);

    const mongoClient: Mongo.MongoClient = new Mongo.MongoClient(mongoConnectionString, mongoClientOptions);

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

export async function getMongoDatabase(): Promise<Mongo.Db> {
  return singleton(Mongo.Db, async () => {
    const mongo = await getMongo();
    return mongo.db(mongoDatabase);
  });
}

export async function getMongoCollection<T extends Entity, TDb extends T>({ name }: MongoRepositoryConfig<T, TDb>): Promise<Collection<TDb>> {
  return singleton(`mongo-collection-${name}`, async () => {
    const database = await getMongoDatabase();
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == name) {
        return collection;
      }
    }

    return database.createCollection<MongoDocument<TDb>>(name);
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

export function getMongoCollectionConfig<T extends Entity, TDb extends T = T>(name: string): MongoRepositoryConfig<T, TDb> {
  return { name, type: undefined as unknown as T, databaseType: undefined as unknown as TDb };
}
