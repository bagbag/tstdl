import type { Entity } from '#/database/index.js';
import { ReplaceClass } from '#/injector/decorators.js';
import type { Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Db, Collection as MongoCollection, MongoClient as MongoMongoClient } from 'mongodb';
import type { MongoDocument } from './model/document.js';
import type { MongoConnection, MongoRepositoryConfig } from './types.js';

export type MongoClientArgument = MongoConnection;

/** database name */
export type DatabaseArgument = string | { connection?: MongoConnection, database?: string };

export type CollectionArgument<T extends Entity<any> = Entity, TDb extends Entity<any> = T> = MongoRepositoryConfig<T, TDb>;

@ReplaceClass(MongoMongoClient)
export class MongoClient extends MongoMongoClient implements Resolvable<MongoClientArgument> {
  declare readonly [resolveArgumentType]: MongoClientArgument;
}

@ReplaceClass(Db)
export class Database extends Db implements Resolvable<DatabaseArgument> {
  declare readonly [resolveArgumentType]: DatabaseArgument;
}

@ReplaceClass(MongoCollection)
export class Collection<T extends Entity<any> = Entity, TDb extends Entity<any> = T> extends MongoCollection<MongoDocument<TDb>> implements Resolvable<CollectionArgument<T, TDb>> {
  declare readonly [resolveArgumentType]: CollectionArgument<T, TDb>;
}
