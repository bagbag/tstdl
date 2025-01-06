import { NodePgDatabase } from 'drizzle-orm/node-postgres';

import { ReplaceClass } from '#/injector/decorators.js';
import { Resolvable, type resolveArgumentType } from '#/injector/interfaces.js';
import { DatabaseArgument } from './module.js';

@ReplaceClass(NodePgDatabase)
export class Database extends NodePgDatabase<any> implements Resolvable<DatabaseArgument> {
  declare readonly [resolveArgumentType]?: DatabaseArgument;
}
