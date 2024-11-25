/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { drizzle } from 'drizzle-orm/node-postgres';

import { NotFoundError } from '#/errors/not-found.error.js';
import { NotImplementedError } from '#/errors/not-implemented.error.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject } from '#/injector/inject.js';
import { injectionToken } from '#/injector/token.js';
import type { Paths, TypedOmit } from '#/types.js';
import { assertDefinedPass, isUndefined } from '#/utils/type-guards.js';
import { count, eq, inArray, sql, SQL } from 'drizzle-orm';
import { getDrizzleTableFromType } from './drizzle/schema-converter.js';
import type { Entity, EntityMetadata, EntityType, NewEntity } from './entity.js';
import type { Query } from './query.js';

export const repositoryType: unique symbol = Symbol('repositoryType');

export type OrderOptions<T extends Entity> = { order?: { [P in Paths<T>]?: 1 | -1 | 'asc' | 'desc' } };

export type LoadOptions<T extends Entity> = OrderOptions<T> & { offset?: number };
export type LoadManyOptions<T extends Entity> = LoadOptions<T> & { limit?: number };

export type EntityMetadataUpdate = { metadata?: Partial<EntityMetadata> };
export type EntityUpdate<T extends Entity> = Partial<TypedOmit<T, 'metadata'>> & EntityMetadataUpdate;

export const entityType = injectionToken<EntityType<any>>('Entity type');

@Singleton()
export abstract class EntityRepository<T extends Entity = Entity> {
  readonly type = inject<EntityType<T>>(entityType);
  readonly schema = getDrizzleTableFromType('', this.type as EntityType);

  readonly database = drizzle('');

  async load(id: string): Promise<T> {
    const entity = await this.tryLoad(id);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }

    return entity;
  }

  async tryLoad(id: string): Promise<T | undefined> {
    return this.tryLoadByQuery(eq(this.schema.id, id));
  }

  async loadByQuery(query: Query<T> | SQL | undefined, options?: LoadOptions<T>): Promise<T> {
    const entity = await this.tryLoadByQuery(query, options);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} not found.`);
    }

    return entity;
  }

  async tryLoadByQuery(query: Query<T> | SQL | undefined, options?: LoadOptions<T>): Promise<T | undefined> {
    if (!(query instanceof SQL)) {
      throw new NotSupportedError();
    }

    const dbQuery = this.database.select()
      .from(this.schema)
      .where(query)
      .offset(options?.offset!);

    const [entity] = (await dbQuery) as T[];
    return entity;
  }

  async loadMany(ids: string[], options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery(inArray(this.schema.id, ids), options);
  }

  async *loadManyCursor(ids: string[], options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadMany(ids, options);
    yield* entities;
  }

  async loadManyByQuery(query: Query<T> | SQL | undefined, options?: LoadManyOptions<T>): Promise<T[]> {
    if (!(query instanceof SQL)) {
      throw new NotSupportedError();
    }

    const dbQuery = this.database.select()
      .from(this.schema)
      .where(query)
      .offset(options?.offset!)
      .limit(options?.limit!);

    return dbQuery as Promise<T[]>;
  }

  async *loadManyByQueryCursor(query: Query<T> | SQL | undefined, options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadManyByQuery(query, options);
    yield* entities;
  }

  async loadAll(options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery(undefined, options);
  }

  async *loadAllCursor(options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadAll(options);
    yield* entities;
  }

  async count(): Promise<number> {
    const dbQuery = this.database
      .select({ count: count() })
      .from(this.schema);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async countByQuery(query: Query<T> | SQL): Promise<number> {
    if (!(query instanceof SQL)) {
      throw new NotSupportedError();
    }

    const dbQuery = this.database
      .select({ count: count() })
      .from(this.schema)
      .where(query);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async has(id: string): Promise<boolean> {
    return this.hasByQuery(eq(this.schema.id, id));
  }

  async hasByQuery(query: Query<T> | SQL): Promise<boolean> {
    // SELECT EXISTS(SELECT 1 FROM contact WHERE id=12) as exists
    if (!(query instanceof SQL)) {
      throw new NotSupportedError();
    }

    const dbQuery = this.database
      .select({
        exists: sql<boolean>`SELECT EXISTS(SELECT 1 FROM ${this.schema} WHERE ${query})`
      })
      .from(this.schema)
      .where(query);

    const [result] = await dbQuery;
    return assertDefinedPass(result).exists;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const result = await this.database.execute<{ contains: boolean }>(sql`SELECT array_agg(id) @> ${ids} AS contains FROM ${this.schema};`);
    return assertDefinedPass(result.rows[0]).contains;
  }

  async insert(_entity: NewEntity<T>): Promise<T> {
    // await this.database.insert(this.schema).values([entity as T]);
    throw new NotImplementedError();
  }

  abstract insertMany(entities: NewEntity<T>[]): Promise<T[]>;

  abstract update(id: string, update: EntityUpdate<T>): Promise<void>;
  abstract updateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<void>;
  abstract updateMany(ids: string[], update: EntityUpdate<T>): Promise<void>;
  abstract updateManyByQuery(filter: Query<T>, update: EntityUpdate<T>): Promise<void>;

  abstract delete(id: string): Promise<boolean>;
  abstract deleteMany(ids: string[]): Promise<number>;
  abstract deleteByQuery(query: Query<T>): Promise<boolean>;
  abstract deleteManyByQuery(query: Query<T>): Promise<number>;
}
