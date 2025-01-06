import { drizzle } from 'drizzle-orm/node-postgres';
import type { PoolConfig } from 'pg';

import { inject, injectionToken } from '#/injector/index.js';
import { Injector } from '#/injector/injector.js';
import { isUndefined } from '#/utils/type-guards.js';
import { Database } from './database.js';

export type DatabaseConfig = { connection: DatabaseArgument };
export type DatabaseArgument = string | PoolConfig;

export const DATABASE_CONFIG = injectionToken<DatabaseConfig>('EntityRepositoryConfig');


Injector.registerSingleton(Database, {
  useFactory: (argument) => {
    const connection = argument ?? inject(DATABASE_CONFIG, undefined, { optional: true })?.connection;

    if (isUndefined(connection)) {
      throw new Error('Missing postgres connection. Provide it either via injection argument or provider.');
    }

    return drizzle({ connection });
  }
});
