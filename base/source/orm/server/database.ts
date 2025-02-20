import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import type { PoolConfig } from 'pg';
import pg from 'pg';

import { inject, Injector, ReplaceClass } from '#/injector/index.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { isUndefined } from '#/utils/type-guards.js';
import { DatabaseConfig } from './module.js';

export type DatabaseArgument = PoolConfig;

@ReplaceClass(NodePgDatabase)
export class Database extends NodePgDatabase<any> implements Resolvable<DatabaseArgument> {
  declare readonly [resolveArgumentType]?: DatabaseArgument;
}

Injector.registerSingleton(Database, {
  useFactory: (argument, context) => {
    const connection = argument ?? inject(DatabaseConfig, undefined, { optional: true })?.connection;

    if (isUndefined(connection)) {
      throw new Error('Missing postgres connection. Provide it either via injection argument or a provider for DatabaseConfig.');
    }

    const pool = new pg.Pool(connection);
    context.addDisposeHandler(async () => pool.end());

    return drizzle(pool);
  }
});

export { migrate };
