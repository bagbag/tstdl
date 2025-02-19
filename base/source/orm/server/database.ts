import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PoolConfig } from 'pg';

import { inject, Injector, ReplaceClass } from '#/injector/index.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { isUndefined } from '#/utils/type-guards.js';
import { DatabaseConfig } from './module.js';

export type DatabaseArgument = string | PoolConfig;

@ReplaceClass(NodePgDatabase)
export class Database extends NodePgDatabase<any> implements Resolvable<DatabaseArgument> {
  declare readonly [resolveArgumentType]?: DatabaseArgument;
}

Injector.registerSingleton(Database, {
  useFactory: (argument) => {
    const connection = argument ?? inject(DatabaseConfig, undefined, { optional: true })?.connection;

    if (isUndefined(connection)) {
      throw new Error('Missing postgres connection. Provide it either via injection argument or provider.');
    }

    return drizzle({ connection });
  }
});

export { migrate };
