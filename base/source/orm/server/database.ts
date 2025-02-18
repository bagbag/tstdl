import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { ReplaceClass } from '#/injector/decorators.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { DatabaseArgument } from './module.js';

@ReplaceClass(NodePgDatabase)
export class Database extends NodePgDatabase<any> implements Resolvable<DatabaseArgument> {
  declare readonly [resolveArgumentType]?: DatabaseArgument;
}
