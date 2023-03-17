/* eslint-disable max-classes-per-file */
import type { Injectable } from '#/container/index.js';
import { replaceClass, type resolveArgumentType } from '#/container/index.js';
import type { Entity } from '#/database/index.js';
import { Db, Collection as MongoCollection, MongoClient as MongoMongoClient } from 'mongodb';
import type { MongoDocument } from './model/document.js';
import type { MongoConnection, MongoRepositoryConfig } from './types.js';

export type MongoClientArgument = MongoConnection;

/** database name */
export type DatabaseArgument = string | { connection?: MongoConnection, database?: string };

export type CollectionArgument<T extends Entity<any> = Entity, TDb extends Entity<any> = T> = MongoRepositoryConfig<T, TDb>;

@replaceClass(MongoMongoClient)
export class MongoClient extends MongoMongoClient implements Injectable<MongoClientArgument> {
  declare readonly [resolveArgumentType]: MongoClientArgument;
}

@replaceClass(Db)
export class Database extends Db implements Injectable<DatabaseArgument> {
  declare readonly [resolveArgumentType]: DatabaseArgument;
}

@replaceClass(MongoCollection)
export class Collection<T extends Entity<any> = Entity, TDb extends Entity<any> = T> extends MongoCollection<MongoDocument<TDb>> implements Injectable<CollectionArgument<T, TDb>> {
  declare readonly [resolveArgumentType]: CollectionArgument<T, TDb>;
}
