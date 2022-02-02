/* eslint-disable max-classes-per-file */
import type { Injectable } from '#/container';
import { replaceClass, resolveArgumentType } from '#/container';
import type { Entity } from '#/database';
import { Collection as MongoCollection, Db, MongoClient as MongoMongoClient } from 'mongodb';
import type { MongoDocument } from './model';
import type { MongoConnection, MongoRepositoryConfig } from './types';

export type MongoClientArgument = MongoConnection;

/** database name */
export type DatabaseArgument = string | { connection?: MongoConnection, database: string };

export type CollectionArgument<T extends Entity = Entity, TDb extends Entity = T> = MongoRepositoryConfig<T, TDb>;

@replaceClass(MongoMongoClient)
export class MongoClient extends MongoMongoClient implements Injectable<MongoClientArgument> {
  readonly [resolveArgumentType]: MongoClientArgument;
}

@replaceClass(Db)
export class Database extends Db implements Injectable<DatabaseArgument> {
  readonly [resolveArgumentType]: DatabaseArgument;
}

@replaceClass(MongoCollection)
export class Collection<T extends Entity = Entity, TDb extends Entity = T> extends MongoCollection<MongoDocument<T>> implements Injectable<CollectionArgument<T, TDb>> {
  readonly [resolveArgumentType]: CollectionArgument<T, TDb>;
}
