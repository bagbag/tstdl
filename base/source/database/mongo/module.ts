import { container } from '#/container/index.js';
import { connect, disposer } from '#/core.js';
import { Logger } from '#/logger/index.js';
import { assertDefined, isObject, isString } from '#/utils/type-guards.js';
import type { Entity } from '../entity.js';
import type { DatabaseArgument, MongoClientArgument } from './classes.js';
import { Collection, Database, MongoClient } from './classes.js';
import type { MongoDocument } from './model/document.js';
import type { MongoConnection } from './types.js';

export type MongoModuleConfig = {
  defaultConnection: MongoConnection,
  defaultDatabase: string | undefined,
  logPrefix: string
};

export const mongoModuleConfig: MongoModuleConfig = {
  defaultConnection: { url: 'mongodb://localhost:27017/test-db' },
  defaultDatabase: undefined,
  logPrefix: 'MONGO'
};

export function configureMongo(config: Partial<MongoModuleConfig>): void {
  mongoModuleConfig.defaultDatabase = config.defaultDatabase ?? mongoModuleConfig.defaultDatabase;
  mongoModuleConfig.defaultConnection = config.defaultConnection ?? mongoModuleConfig.defaultConnection;
  mongoModuleConfig.logPrefix = config.logPrefix ?? mongoModuleConfig.logPrefix;
}

container.registerSingleton(MongoClient, {
  useFactory: async (argument, context) => {
    assertDefined(argument, 'mongo connection resolve argument missing');

    const { url, ...options } = argument;

    const logger = context.resolve(Logger, mongoModuleConfig.logPrefix);
    const client = new MongoClient(url, options);

    client
      .on('fullsetup', () => logger.verbose('connection setup'))
      .on('reconnect', () => logger.warn('reconnected'))
      .on('timeout', () => logger.warn('connection timed out'))
      .on('close', () => logger.verbose('connection closed'));

    disposer.add(async () => client.close(), 10000);

    await connect(`mongo at ${url}`, async () => client.connect(), logger);

    return client;
  }
}, {
  defaultArgumentProvider: (): MongoClientArgument => mongoModuleConfig.defaultConnection,
  argumentIdentityProvider: JSON.stringify
});

container.registerSingleton(Database, {
  useFactory: async (argument, context) => {
    const connection = isObject(argument) ? argument.connection : mongoModuleConfig.defaultConnection;
    const name = (isString(argument) ? argument : isObject(argument) ? argument.database : undefined) ?? mongoModuleConfig.defaultDatabase;

    const client = await context.resolveAsync(MongoClient, connection);
    return client.db(name) as Database;
  }
}, {
  defaultArgumentProvider: (): DatabaseArgument => ({ database: mongoModuleConfig.defaultDatabase, connection: mongoModuleConfig.defaultConnection }),
  argumentIdentityProvider: JSON.stringify
});

container.registerSingleton(Collection, {
  useFactory: async (config, context) => {
    assertDefined(config, 'mongo repository config resolve argument missing');

    const database = await context.resolveAsync(Database, config);
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == config.collection) {
        return collection as unknown as typeof Collection;
      }
    }

    return database.createCollection<MongoDocument<Entity>>(config.collection) as Promise<any>;
  }
}, {
  argumentIdentityProvider: JSON.stringify
});
