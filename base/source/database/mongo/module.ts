import { connect } from '#/core.js';
import { Injector } from '#/injector/injector.js';
import { Logger } from '#/logger/index.js';
import { assertDefined, isObject, isString } from '#/utils/type-guards.js';
import type { CollectionArgument, DatabaseArgument, MongoClientArgument } from './classes.js';
import { Collection, Database, MongoClient } from './classes.js';
import type { MongoConnection } from './types.js';

export type MongoModuleConfig = {
  defaultConnection: MongoConnection,
  defaultDatabase: string | undefined,
  logPrefix: string
};

export const mongoModuleConfig: MongoModuleConfig = {
  defaultConnection: { url: 'mongodb://localhost:27017/test-db' },
  defaultDatabase: undefined,
  logPrefix: 'Mongo'
};

export function configureMongo(config: Partial<MongoModuleConfig>): void {
  mongoModuleConfig.defaultDatabase = config.defaultDatabase ?? mongoModuleConfig.defaultDatabase;
  mongoModuleConfig.defaultConnection = config.defaultConnection ?? mongoModuleConfig.defaultConnection;
  mongoModuleConfig.logPrefix = config.logPrefix ?? mongoModuleConfig.logPrefix;
}

Injector.registerSingleton<MongoClient, MongoClientArgument, { logger: Logger, url: string }>(MongoClient, {
  useFactory(argument, context) {
    assertDefined(argument, 'mongo connection resolve argument missing');

    const { url, ...options } = argument;

    const logger = context.resolve(Logger, mongoModuleConfig.logPrefix);
    const client = new MongoClient(url, options);

    client
      .on('fullsetup', () => logger.verbose('connection setup'))
      .on('reconnect', () => logger.warn('reconnected'))
      .on('timeout', () => logger.warn('connection timed out'))
      .on('close', () => logger.verbose('connection closed'));

    context.addDisposeHandler(async () => client.close());

    context.data.logger = logger;
    context.data.url = url;

    return client;
  },
  async afterResolve(client, _argument, { cancellationSignal, data: { url, logger } }) {
    await connect(`mongo at ${url}`, async () => client.connect(), logger, cancellationSignal);
  }
}, {
  defaultArgumentProvider: (): MongoClientArgument => mongoModuleConfig.defaultConnection,
  argumentIdentityProvider: JSON.stringify
});

Injector.registerSingleton(Database, {
  useFactory: (argument, context) => {
    const connection = isObject(argument) ? argument.connection : mongoModuleConfig.defaultConnection;
    const name = (isString(argument) ? argument : isObject(argument) ? argument.database : undefined) ?? mongoModuleConfig.defaultDatabase;

    const client = context.resolve(MongoClient, connection);
    return client.db(name) as Database;
  },
  defaultArgumentProvider: (): DatabaseArgument => ({ database: mongoModuleConfig.defaultDatabase, connection: mongoModuleConfig.defaultConnection }),
}, {
  argumentIdentityProvider: JSON.stringify
});

Injector.registerSingleton<Collection, CollectionArgument, { database: Database }>(Collection, {
  useFactory: (config, context) => {
    assertDefined(config, 'mongo repository config resolve argument missing');

    const database = context.resolve(Database, config);

    context.data.database = database;

    return database.collection(config.collection) as Collection;
  },
  async afterResolve(_, config, { data: { database } }) {
    const existingCollections = await database.collections();

    for (const collection of existingCollections) {
      if (collection.collectionName == config.collection) {
        return;
      }
    }

    await database.createCollection(config.collection);
  }
}, {
  argumentIdentityProvider: JSON.stringify
});
