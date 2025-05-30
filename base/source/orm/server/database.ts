/**
 * @module
 * Provides the core database connection and migration functionality using Drizzle ORM and node-postgres.
 * It sets up the dependency injection for the database instance.
 */
import { drizzle, NodePgDatabase } from 'drizzle-orm/node-postgres';
import { migrate } from 'drizzle-orm/node-postgres/migrator';
import { Pool, type PoolConfig } from 'pg';

import { inject, Injector, ReplaceClass } from '#/injector/index.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { isUndefined } from '#/utils/type-guards.js';
import { DatabaseConfig } from './module.js';

/**
 * Type alias for the argument required to resolve a Database instance via the injector.
 * Represents the PostgreSQL pool configuration.
 */
export type DatabaseArgument = PoolConfig;

/**
 * Represents the application's database connection.
 * Extends Drizzle's `NodePgDatabase` and integrates with the dependency injection system.
 * Can be resolved using a `PoolConfig` argument.
 */
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

    const pool = new Pool({
      idle_in_transaction_session_timeout: 10000,
      ...connection,
    });

    context.addDisposeHandler(async () => await pool.end());

    return drizzle(pool);
  },
});

export { migrate };
