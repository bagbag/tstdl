import { container } from '#/container';
import { connect, disposer } from '#/core';
import { Logger } from '#/logger';
import { assertDefined, isString } from '#/utils/type-guards';
import * as Mongo from 'mongodb';
import type { Entity } from '../entity';
import { Collection, Database, MongoClient } from './classes';
import type { MongoDocument } from './model';
import type { MongoConnection } from './types';

export type MongoModuleConfig = {
  defaultConnection: MongoConnection,
  defaultDatabase: string,
  logPrefix: string
};

export const mongoModuleConfig: MongoModuleConfig = {
  defaultConnection: { url: 'mongodb://localhost:27017' },
  defaultDatabase: 'test-database',
  logPrefix: 'MONGO'
};

let mongoLogger: Logger = container.resolve(Logger, mongoModuleConfig.logPrefix);

export function configureMongo(config: Partial<MongoModuleConfig>): void {
  mongoModuleConfig.defaultDatabase = config.defaultDatabase ?? mongoModuleConfig.defaultDatabase;
  mongoModuleConfig.defaultConnection = config.defaultConnection ?? mongoModuleConfig.defaultConnection;
  mongoModuleConfig.logPrefix = config.logPrefix ?? mongoModuleConfig.logPrefix;

  mongoLogger = container.resolve(Logger, mongoModuleConfig.logPrefix);
}

Mongo.Logger.setCurrentLogger((message, parameters) => mongoLogger.verbose(JSON.stringify({ message, parameters }, undefined, 2)));

container.register(MongoClient, {
  useAsyncFactory: async (argument, resolveContainer) => {
    assertDefined(argument, 'mongo connection resolve argument missing');

    const { url, ...options } = argument;

    const logger = resolveContainer.resolve(Logger, mongoModuleConfig.logPrefix);
    const client = new MongoClient(url, options);

    client
      .on('fullsetup', () => logger.verbose('connection setup'))
      .on('reconnect', () => logger.warn('reconnected'))
      .on('timeout', () => logger.warn('connection timed out'))
      .on('close', () => logger.verbose('connection closed'));

    disposer.add(async () => client.close());

    await connect('mongo', async () => client.connect(), logger);

    return client;
  }
}, { defaultArgumentProvider: () => mongoModuleConfig.defaultConnection });

container.register(Database, {
  useAsyncFactory: async (argument, resolveContainer) => {
    assertDefined(argument, 'mongo database resolve argument missing');

    const connection = isString(argument) ? mongoModuleConfig.defaultConnection : argument.connection;
    const name = isString(argument) ? argument : argument.database;

    const client = await resolveContainer.resolveAsync(MongoClient, connection);
    return client.db(name) as any;
  }
});

container.register(Collection, {
  useAsyncFactory: async (config, resolveContainer) => {
    assertDefined(config, 'mongo repository config resolve argument missing');

    const database = await resolveContainer.resolveAsync(Database, config);
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == config.collection) {
        return collection as unknown as typeof Collection;
      }
    }

    return database.createCollection<MongoDocument<Entity>>(config.collection) as any;
  }
});
