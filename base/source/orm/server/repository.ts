/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { and, asc, count, desc, eq, inArray, isNull, isSQLWrapper, SQL, sql } from 'drizzle-orm';
import type { PgColumn, PgInsertValue, PgUpdateSetSource } from 'drizzle-orm/pg-core';
import { match } from 'ts-pattern';

import { NotFoundError } from '#/errors/not-found.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { JsonPath } from '#/json-path/index.js';
import { Schema } from '#/schema/schema.js';
import type { DeepPartial, OneOrMany, Paths, Record, Type } from '#/types.js';
import type { UntaggedDeep } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { importSymmetricKey } from '#/utils/cryptography.js';
import { fromDeepObjectEntries, fromEntries, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isArray, isDefined, isString, isUndefined } from '#/utils/type-guards.js';
import { typeExtends } from '#/utils/type/index.js';
import { Entity, type EntityMetadataAttributes, type EntityType, type EntityWithoutMetadata } from '../entity.js';
import type { Query } from '../query.js';
import type { EntityMetadataUpdate, EntityUpdate, LoadManyOptions, LoadOptions, NewEntity, Order, TargetColumnPaths } from '../repository.types.js';
import { TRANSACTION_TIMESTAMP } from '../sqls.js';
import type { Database } from './database.js';
import { getColumnDefinitions, getColumnDefinitionsMap, getDrizzleTableFromType } from './drizzle/schema-converter.js';
import { convertQuery } from './query-converter.js';
import { ENCRYPTION_SECRET } from './tokens.js';
import type { PgTransaction } from './transaction.js';
import { getTransactionalContextData, injectTransactional, injectTransactionalAsync, isInTransactionalContext, Transactional } from './transactional.js';
import type { ColumnDefinition, PgTableFromType, TransformContext } from './types.js';

export const repositoryType: unique symbol = Symbol('repositoryType');

/**
 * Configuration class for EntityRepository.
 * Specifies the database schema to be used.
 */
export class EntityRepositoryConfig {
  /** The name of the database schema. */
  schema: string;
}

const entityTypeToken = Symbol('EntityType');

type EntityRepositoryContext = {
  type: EntityType,
  table: PgTableFromType,
  columnDefinitions: ColumnDefinition[],
  columnDefinitionsMap: Map<string, ColumnDefinition>,
  encryptionSecret: Uint8Array | undefined,
  transformContext: TransformContext | Promise<TransformContext> | undefined
};

type InferSelect<T extends Entity | EntityWithoutMetadata = Entity | EntityWithoutMetadata> = PgTableFromType<EntityType<T>>['$inferSelect'];

@Singleton()
export class EntityRepository<T extends Entity | EntityWithoutMetadata = EntityWithoutMetadata> extends Transactional<EntityRepositoryContext> implements Resolvable<EntityType<T>> {
  readonly #context = isInTransactionalContext() ? getTransactionalContextData(this) : {} as Partial<EntityRepositoryContext>;
  readonly #encryptionSecret = isInTransactionalContext() ? this.#context.encryptionSecret : inject(ENCRYPTION_SECRET, undefined, { optional: true });

  #transformContext: TransformContext | Promise<TransformContext> | undefined = this.#context.transformContext;

  readonly type = (this.#context.type as EntityType<T> | undefined) ?? injectArgument(this, { optional: true }) ?? assertDefinedPass((this.constructor as Record)[entityTypeToken] as EntityType<T>, 'Missing entity type.');
  readonly typeName = this.type.entityName ?? this.type.name;
  readonly #table = this.#context.table ?? getDrizzleTableFromType(this.type as EntityType, inject(EntityRepositoryConfig, undefined, { optional: true })?.schema);
  readonly #tableWithMetadata = this.#table as PgTableFromType<EntityType<Entity>>;
  readonly #columnDefinitions = this.#context.columnDefinitions ?? getColumnDefinitions(this.#table);
  readonly #columnDefinitionsMap = this.#context.columnDefinitionsMap ?? getColumnDefinitionsMap(this.#table);
  readonly hasMetadata = typeExtends(this.type, Entity);

  /**
   * Gets the Drizzle table definition for the entity type.
   */
  get table(): PgTableFromType<EntityType<T>> {
    return this.#table as PgTableFromType<EntityType<T>>;
  }

  declare readonly [resolveArgumentType]: EntityType<T>;

  protected override getTransactionalContextData() {
    const context: EntityRepositoryContext = {
      type: this.type,
      table: this.#table,
      columnDefinitions: this.#columnDefinitions,
      columnDefinitionsMap: this.#columnDefinitionsMap,
      encryptionSecret: this.#encryptionSecret,
      transformContext: this.#transformContext,
    };

    return context;
  }

  /**
   * Loads a single entity by its ID.
   * Throws `NotFoundError` if the entity is not found.
   * @param id The ID of the entity to load.
   * @returns A promise that resolves to the loaded entity.
   * @throws {NotFoundError} If the entity with the given ID is not found.
   */
  async load(id: string): Promise<T> {
    const entity = await this.tryLoad(id);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

  /**
   * Tries to load a single entity by its ID.
   * Returns `undefined` if the entity is not found.
   * @param id The ID of the entity to load.
   * @returns A promise that resolves to the loaded entity or `undefined` if not found.
   */
  async tryLoad(id: string): Promise<T | undefined> {
    return await this.tryLoadByQuery(eq(this.#table.id, id));
  }

  /**
   * Loads a single entity based on a query.
   * Throws `NotFoundError` if no entity matches the query.
   * @param query The query to filter entities.
   * @param options Optional loading options (e.g., offset, order).
   * @returns A promise that resolves to the loaded entity.
   * @throws {NotFoundError} If no entity matches the query.
   */
  async loadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T> {
    const entity = await this.tryLoadByQuery(query, options);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

  /**
   * Tries to load a single entity based on a query.
   * Returns `undefined` if no entity matches the query.
   * @param query The query to filter entities.
   * @param options Optional loading options (e.g., offset, order).
   * @returns A promise that resolves to the loaded entity or `undefined` if not found.
   */
  async tryLoadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(query);

    let dbQuery = this.session.select()
      .from(this.#table)
      .where(sqlQuery)
      .limit(1)
      .$dynamic();

    if (isDefined(options?.offset)) {
      dbQuery = dbQuery.offset(options.offset);
    }

    if (isDefined(options?.order)) {
      dbQuery = dbQuery.orderBy(...this.convertOrderBy(options.order));
    }

    const [row] = await dbQuery;

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Loads multiple entities by their IDs.
   * @param ids An array of entity IDs to load.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns A promise that resolves to an array of loaded entities.
   */
  async loadMany(ids: string[], options?: LoadManyOptions<T>): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.loadManyByQuery(inArray(this.#table.id, ids), options);
  }

  /**
   * Loads multiple entities by their IDs and returns them as an async iterable cursor.
   * @param ids An array of entity IDs to load.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns An async iterable iterator of loaded entities.
   */
  async *loadManyCursor(ids: string[], options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadMany(ids, options);
    yield* entities;
  }

  /**
   * Loads multiple entities based on a query.
   * @param query The query to filter entities.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns A promise that resolves to an array of loaded entities.
   */
  async loadManyByQuery(query: Query<T>, options?: LoadManyOptions<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    let dbQuery = match(options?.distinct ?? false)
      .with(false, () => this.session.select())
      .with(true, () => this.session.selectDistinct())
      .otherwise((targets) => {
        const ons = targets.map((target) => isString(target) ? this.getColumn(target) : target);
        return this.session.selectDistinctOn(ons);
      })
      .from(this.#table)
      .where(sqlQuery)
      .$dynamic();

    if (isDefined(options?.offset)) {
      dbQuery = dbQuery.offset(options.offset);
    }

    if (isDefined(options?.limit)) {
      dbQuery = dbQuery.limit(options.limit);
    }

    if (isDefined(options?.order)) {
      dbQuery = dbQuery.orderBy(...this.convertOrderBy(options.order));
    }

    const rows = await dbQuery;

    return await this.mapManyToEntity(rows);
  }

  /**
   * Loads multiple entities based on a query and returns them as an async iterable cursor.
   * @param query The query to filter entities.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns An async iterable iterator of loaded entities.
   */
  async *loadManyByQueryCursor(query: Query<T>, options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadManyByQuery(query, options);
    yield* entities;
  }

  /**
   * Loads all entities of the repository's type.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns A promise that resolves to an array of all entities.
   */
  async loadAll(options?: LoadManyOptions<T>): Promise<T[]> {
    return await this.loadManyByQuery({}, options);
  }

  /**
   * Loads all entities of the repository's type and returns them as an async iterable cursor.
   * @param options Optional loading options (e.g., offset, limit, order).
   * @returns An async iterable iterator of all entities.
   */
  async *loadAllCursor(options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadAll(options);
    yield* entities;
  }

  /**
   * Counts the total number of entities of the repository's type.
   * @returns A promise that resolves to the total count.
   */
  async count(): Promise<number> {
    const dbQuery = this.session
      .select({ count: count() })
      .from(this.#table);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  /**
   * Counts the number of entities matching a query.
   * @param query The query to filter entities.
   * @returns A promise that resolves to the count of matching entities.
   */
  async countByQuery(query: Query<T>): Promise<number> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session
      .select({ count: count() })
      .from(this.#table)
      .where(sqlQuery);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  /**
   * Checks if an entity with the given ID exists.
   * @param id The ID of the entity to check.
   * @returns A promise that resolves to `true` if the entity exists, `false` otherwise.
   */
  async has(id: string): Promise<boolean> {
    return await this.hasByQuery(eq(this.#table.id, id));
  }

  /**
   * Checks if any entity matches the given query.
   * @param query The query to filter entities.
   * @returns A promise that resolves to `true` if at least one entity matches the query, `false` otherwise.
   */
  async hasByQuery(query: Query<T>): Promise<boolean> {
    const sqlQuery = this.convertQuery(query);

    const result = await this.session.execute<{ exists: boolean }>(sql<boolean>`SELECT EXISTS(SELECT 1 FROM ${this.#table} WHERE ${sqlQuery}) AS exists`);

    console.log(result);
    throw new Error('handle result');
  }

  /**
   * Checks if all entities with the given IDs exist.
   * @param ids An array of entity IDs to check.
   * @returns A promise that resolves to `true` if all entities exist, `false` otherwise. If `ids` is empty, returns `false`.
   */
  async hasAll(ids: string[]): Promise<boolean> {
    if (ids.length === 0) {
      return false;
    }

    const result = await this.session
      .select({ contains: sql<boolean>`array_agg(${this.#table.id}) @> ${ids}`.as('contains') })
      .from(this.#table);

    return assertDefinedPass(result[0]).contains;
  }

  /**
   * Tries to insert using ON CONFLICT DO NOTHING
   * @param entity entity to insert
   * @returns entity if inserted, undefined on conflict
   */
  async tryInsert(entity: NewEntity<T>): Promise<T | undefined> {
    const columns = await this.mapToInsertColumns(entity);

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoNothing()
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Inserts a new entity into the database.
   * @param entity The entity to insert.
   * @returns A promise that resolves to the inserted entity.
   */
  async insert(entity: NewEntity<T>): Promise<T> {
    const columns = await this.mapToInsertColumns(entity);

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .returning();

    return await this.mapToEntity(row!);
  }

  /**
   * Inserts multiple new entities into the database.
   * @param entities An array of entities to insert.
   * @returns A promise that resolves to an array of the inserted entities.
   */
  async insertMany(entities: NewEntity<T>[]): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    const columns = await this.mapManyToInsertColumns(entities);
    const rows = await this.session.insert(this.#table).values(columns).returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Inserts an entity if it does not already exist based on the target columns.
   * @param target The column(s) to use for conflict detection.
   * @param entity The entity to insert.
   * @returns A promise that resolves to the inserted or existing entity.
   */
  async insertIfNotExists(target: OneOrMany<Paths<UntaggedDeep<T>>>, entity: NewEntity<T>): Promise<T | undefined> {
    const targetColumns = toArray(target).map((path) => this.getColumn(path));
    const columns = await this.mapToInsertColumns(entity);

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoNothing({ target: targetColumns })
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Inserts many entities if they do not already exist based on the target columns.
   * @param target The column(s) to use for conflict detection.
   * @param entities The entities to insert.
   * @returns A promise that resolves to the inserted or existing entities.
   */
  async insertManyIfNotExists(target: OneOrMany<Paths<UntaggedDeep<T>>>, entities: NewEntity<T>[]): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    const targetColumns = toArray(target).map((path) => this.getColumn(path));
    const columns = await this.mapManyToInsertColumns(entities);

    const rows = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoNothing({ target: targetColumns })
      .returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Inserts an entity or updates it if a conflict occurs based on the target columns.
   * @param target The column(s) to use for conflict detection.
   * @param entity The entity to insert.
   * @param update Optional update to apply if a conflict occurs. Defaults to the inserted entity's values.
   * @returns A promise that resolves to the inserted or updated entity.
   */
  async upsert(target: OneOrMany<Paths<UntaggedDeep<T>>>, entity: NewEntity<T>, update?: EntityUpdate<T>): Promise<T> {
    const targetColumns = toArray(target).map((path) => this.getColumn(path));

    const columns = await this.mapToInsertColumns(entity);
    const mappedUpdate = await this.mapUpdate(update ?? (entity as EntityUpdate<T>));

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate,
      })
      .returning();

    return await this.mapToEntity(row!);
  }

  /**
   * Inserts multiple entities or updates them if a conflict occurs based on the target columns.
   * @param target The column(s) to use for conflict detection.
   * @param entities An array of entities to insert.
   * @param update Optional update to apply if a conflict occurs. Defaults to the inserted entity's values.
   * @returns A promise that resolves to an array of the inserted or updated entities.
   */
  async upsertMany(target: OneOrMany<Paths<UntaggedDeep<T>>>, entities: NewEntity<T>[], update?: EntityUpdate<T>): Promise<T[]> {
    if (entities.length === 0) {
      return [];
    }

    const targetColumns = toArray(target).map((path) => this.getColumn(path));

    const columns = await this.mapManyToInsertColumns(entities);
    const mappedUpdate = isDefined(update)
      ? await this.mapUpdate(update)
      : {
        ...fromEntries(this.#columnDefinitions.map((column) => [column.name, sql`excluded.${sql.identifier(this.getColumn(column).name)}`] as const)),
        ...this._getMetadataUpdate(update),
      };

    const rows = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate,
      })
      .returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Updates an entity by its ID.
   * Throws `NotFoundError` if the entity is not found.
   * @param id The ID of the entity to update.
   * @param update The update to apply to the entity.
   * @returns A promise that resolves to the updated entity.
   * @throws {NotFoundError} If the entity with the given ID is not found.
   */
  async update(id: string, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdate(id, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

  /**
   * Tries to update an entity by its ID.
   * Returns `undefined` if the entity is not found.
   * @param id The ID of the entity to update.
   * @param update The update to apply to the entity.
   * @returns A promise that resolves to the updated entity or `undefined` if not found.
   */
  async tryUpdate(id: string, update: EntityUpdate<T>): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(eq(this.#table.id, id));
    const mappedUpdate = await this.mapUpdate(update);

    const [row] = await this.session
      .update(this.#table)
      .set(mappedUpdate)
      .where(sqlQuery)
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Updates a single entity matching a query.
   * Throws `NotFoundError` if no entity matches the query.
   * @param query The query to filter entities.
   * @param update The update to apply to the entity.
   * @returns A promise that resolves to the updated entity.
   * @throws {NotFoundError} If no entity matches the query.
   */
  async updateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdateByQuery(query, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

  /**
   * Tries to update a single entity matching a query.
   * Returns `undefined` if no entity matches the query.
   * @param query The query to filter entities.
   * @param update The update to apply to the entity.
   * @returns A promise that resolves to the updated entity or `undefined` if not found.
   */
  async tryUpdateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T | undefined> {
    const mappedUpdate = await this.mapUpdate(update);
    const idQuery = this.getIdLimitSelect(query);

    const [row] = await this.session
      .update(this.#table)
      .set(mappedUpdate)
      .where(inArray(this.#table.id, idQuery.for('update')))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Updates multiple entities by their IDs.
   * @param ids An array of entity IDs to update.
   * @param update The update to apply to the entities.
   * @returns A promise that resolves to an array of the updated entities.
   */
  async updateMany(ids: string[], update: EntityUpdate<T>): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.updateManyByQuery(inArray(this.#table.id, ids), update);
  }

  /**
   * Updates multiple entities matching a query.
   * @param query The query to filter entities.
   * @param update The update to apply to the entities.
   * @returns A promise that resolves to an array of the updated entities.
   */
  async updateManyByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);
    const mappedUpdate = await this.mapUpdate(update);

    const rows = await this.session
      .update(this.#table)
      .set(mappedUpdate)
      .where(sqlQuery)
      .returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Deletes an entity by its ID (soft delete if metadata is available).
   * Throws `NotFoundError` if the entity is not found.
   * @param id The ID of the entity to delete.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to the deleted entity.
   * @throws {NotFoundError} If the entity with the given ID is not found.
   */
  async delete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDelete(id, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

  /**
   * Tries to delete an entity by its ID (soft delete if metadata is available).
   * Returns `undefined` if the entity is not found.
   * @param id The ID of the entity to delete.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to the deleted entity or `undefined` if not found.
   */
  async tryDelete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    if (!this.hasMetadata) {
      return await this.tryHardDelete(id);
    }

    const sqlQuery = this.convertQuery(eq(this.#table.id, id));

    const [row] = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes),
      })
      .where(sqlQuery)
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Deletes a single entity matching a query (soft delete if metadata is available).
   * Throws `NotFoundError` if no entity matches the query.
   * @param query The query to filter entities.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to the deleted entity.
   * @throws {NotFoundError} If no entity matches the query.
   */
  async deleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDeleteByQuery(query, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

  /**
   * Tries to delete a single entity matching a query (soft delete if metadata is available).
   * Returns `undefined` if no entity matches the query.
   * @param query The query to filter entities.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to the deleted entity or `undefined` if not found.
   */
  async tryDeleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    if (!this.hasMetadata) {
      return await this.tryHardDeleteByQuery(query);
    }

    const idQuery = this.getIdLimitSelect(query);

    const [row] = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes),
      })
      .where(inArray(this.#table.id, idQuery.for('update')))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Deletes multiple entities by their IDs (soft delete if metadata is available).
   * @param ids An array of entity IDs to delete.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to an array of the deleted entities.
   */
  async deleteMany(ids: string[], metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.deleteManyByQuery(inArray(this.#table.id, ids), metadataUpdate);
  }

  /**
   * Deletes multiple entities matching a query (soft delete if metadata is available).
   * @param query The query to filter entities.
   * @param metadataUpdate Optional metadata update to apply during soft delete.
   * @returns A promise that resolves to an array of the deleted entities.
   */
  async deleteManyByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    if (!this.hasMetadata) {
      return await this.hardDeleteManyByQuery(query);
    }

    const sqlQuery = this.convertQuery(query);

    const rows = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes),
      })
      .where(sqlQuery)
      .returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Hard deletes an entity by its ID (removes from the database).
   * Throws `NotFoundError` if the entity is not found.
   * @param id The ID of the entity to hard delete.
   * @returns A promise that resolves to the hard deleted entity.
   * @throws {NotFoundError} If the entity with the given ID is not found.
   */
  async hardDelete(id: string): Promise<T> {
    const result = await this.tryHardDelete(id);

    if (!result) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return result;
  }

  /**
   * Tries to hard delete an entity by its ID (removes from the database).
   * Returns `undefined` if the entity is not found.
   * @param id The ID of the entity to hard delete.
   * @returns A promise that resolves to the hard deleted entity or `undefined` if not found.
   */
  async tryHardDelete(id: string): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(eq(this.#table.id, id));

    const [row] = await this.session
      .delete(this.#table)
      .where(sqlQuery)
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Hard deletes a single entity matching a query (removes from the database).
   * Throws `NotFoundError` if no entity matches the query.
   * @param query The query to filter entities.
   * @returns A promise that resolves to the hard deleted entity.
   * @throws {NotFoundError} If no entity matches the query.
   */
  async hardDeleteByQuery(query: Query<T>): Promise<T> {
    const result = await this.tryHardDeleteByQuery(query);

    if (!result) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return result;
  }

  /**
   * Tries to hard delete a single entity matching a query (removes from the database).
   * Returns `undefined` if no entity matches the query.
   * @param query The query to filter entities.
   * @returns A promise that resolves to the hard deleted entity or `undefined` if not found.
   */
  async tryHardDeleteByQuery(query: Query<T>): Promise<T | undefined> {
    const idQuery = this.getIdLimitSelect(query);

    const [row] = await this.session
      .delete(this.#table)
      .where(inArray(this.#table.id, idQuery.for('update')))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return await this.mapToEntity(row);
  }

  /**
   * Hard deletes multiple entities by their IDs (removes from the database).
   * @param ids An array of entity IDs to hard delete.
   * @returns A promise that resolves to an array of the hard deleted entities.
   */
  async hardDeleteMany(ids: string[]): Promise<T[]> {
    if (ids.length === 0) {
      return [];
    }

    return await this.hardDeleteManyByQuery(inArray(this.#table.id, ids));
  }

  /**
   * Hard deletes multiple entities matching a query (removes from the database).
   * @param query The query to filter entities.
   * @returns A promise that resolves to an array of the hard deleted entities.
   */
  async hardDeleteManyByQuery(query: Query<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    const rows = await this.session
      .delete(this.#table)
      .where(sqlQuery)
      .returning();

    return await this.mapManyToEntity(rows);
  }

  /**
   * Retrieves the Drizzle PgColumn for a given object path or column definition.
   * @param pathOrColumn The object path or column definition.
   * @returns The corresponding PgColumn.
   */
  getColumn(pathOrColumn: TargetColumnPaths<T> | ColumnDefinition): PgColumn {
    if (isString(pathOrColumn)) {
      const columnName = assertDefinedPass(this.#columnDefinitionsMap.get(pathOrColumn), `Could not map ${pathOrColumn} to column.`).name;
      return this.#table[columnName as keyof PgTableFromType] as PgColumn;
    }

    return this.#table[pathOrColumn.name as keyof PgTableFromType] as PgColumn;
  }

  getColumns(pathOrColumns: (TargetColumnPaths<T> | ColumnDefinition)[]): PgColumn[] {
    return pathOrColumns.map((column) => this.getColumn(column));
  }

  /**
   * Converts an Order object to an array of Drizzle SQL order expressions.
   * @param order The order object.
   * @returns An array of SQL order expressions.
   */
  convertOrderBy(order: Order<T>): SQL[] {
    if (isArray(order)) {
      return order.map((item) => {
        const itemIsArray = isArray(item);
        const target = itemIsArray ? item[0] : item;
        const column = isSQLWrapper(target) ? target : this.getColumn(target);
        const direction = itemIsArray ? item[1] : 'asc';

        return direction == 'asc' ? asc(column) : desc(column);
      });
    }

    if (isString(order)) {
      const column = this.getColumn(order);
      return [asc(column)];
    }

    return objectEntries(order).map(([path, direction]) => {
      const column = this.getColumn(path);
      return direction == 'asc' ? asc(column) : desc(column);
    });
  }

  /**
   * Converts a Query object to a Drizzle SQL where clause.
   * Automatically filters out soft-deleted entities unless `withDeleted` is true.
   * @param query The query object.
   * @param options Optional options, including `withDeleted` to include soft-deleted entities.
   * @returns A Drizzle SQL condition.
   */
  convertQuery(query: Query<T>, options?: { withDeleted?: boolean }): SQL {
    let sql = convertQuery(query, this.#table, this.#columnDefinitionsMap);

    if (!this.hasMetadata || (options?.withDeleted == true)) {
      return sql;
    }

    return and(isNull(this.#tableWithMetadata.deleteTimestamp), sql)!;
  }

  /**
   * Maps multiple database rows to an array of entities.
   * @param columns An array of database rows.
   * @returns A promise that resolves to an array of entities.
   */
  async mapManyToEntity(columns: InferSelect[]): Promise<T[]> {
    const transformContext = await this.getTransformContext();
    return await this._mapManyToEntity(columns as any as InferSelect[], transformContext);
  }

  /**
   * Maps a single database row to an entity.
   * @param columns A database row.
   * @returns A promise that resolves to an entity.
   */
  async mapToEntity(columns: InferSelect): Promise<T> {
    const transformContext = await this.getTransformContext();
    return await this._mapToEntity(columns as any as InferSelect, transformContext);
  }

  /**
   * Maps multiple entity-like objects to database column values for insertion or update.
   * @param objects An array of entity-like objects.
   * @returns A promise that resolves to an array of database column values.
   */
  async mapManyToColumns(objects: (DeepPartial<T> | NewEntity<T>)[]): Promise<PgInsertValue<PgTableFromType>[]> {
    const transformContext = await this.getTransformContext();
    return await this._mapManyToColumns(objects, transformContext);
  }

  /**
   * Maps a single entity-like object to database column values for insertion or update.
   * @param obj An entity-like object.
   * @returns A promise that resolves to database column values.
   */
  async mapToColumns(obj: DeepPartial<T> | NewEntity<T>): Promise<PgInsertValue<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return await this._mapToColumns(obj, transformContext);
  }

  /**
   * Maps multiple new entity objects to database column values for insertion.
   * @param objects An array of new entity objects.
   * @returns A promise that resolves to an array of database column values for insertion.
   */
  async mapManyToInsertColumns(objects: (DeepPartial<T> | NewEntity<T>)[]): Promise<PgInsertValue<PgTableFromType>[]> {
    const transformContext = await this.getTransformContext();
    return await this._mapManyToInsertColumns(objects, transformContext);
  }

  /**
   * Maps a new entity object to database column values for insertion.
   * @param obj A new entity object.
   * @returns A promise that resolves to database column values for insertion.
   */
  async mapToInsertColumns(obj: DeepPartial<T> | NewEntity<T>): Promise<PgInsertValue<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return await this._mapToInsertColumns(obj, transformContext);
  }

  /**
   * Maps an entity update object to database column values for updating.
   * @param update The entity update object.
   * @returns A promise that resolves to database column values for updating.
   */
  async mapUpdate(update: EntityUpdate<T>): Promise<PgUpdateSetSource<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return await this._mapUpdate(update, transformContext);
  }

  /**
   * Gets a Drizzle select query for the ID of a single entity matching the provided query, limited to 1 result.
   * Useful for subqueries in update/delete operations targeting a single entity.
   * @param query The query to filter entities.
   * @returns A Drizzle select query for the entity ID.
   */
  getIdLimitQuery(query: Query<T>) {
    return this.getIdLimitSelect(query);
  }

  protected getAttributesUpdate(attributes: SQL | EntityMetadataAttributes | undefined) {
    if (isUndefined(attributes)) {
      return undefined;
    }

    if (attributes instanceof SQL) {
      return attributes;
    }

    return sql`${this.#tableWithMetadata.attributes} || ${JSON.stringify(attributes)}::jsonb`;
  }

  protected async _mapManyToEntity(columns: InferSelect[], transformContext: TransformContext): Promise<T[]> {
    return await toArrayAsync(mapAsync(columns, async (column) => await this._mapToEntity(column, transformContext)));
  }

  protected async _mapToEntity(columns: InferSelect, transformContext: TransformContext): Promise<T> {
    const entries: [JsonPath, InferSelect[keyof InferSelect]][] = [];

    for (const def of this.#columnDefinitions) {
      const rawValue = columns[def.name as keyof InferSelect];
      const transformed = await def.fromDatabase(rawValue, transformContext);

      entries.push([def.objectPath, transformed] as const); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }

    const obj = fromDeepObjectEntries(entries);
    return Schema.parse(this.type, obj);
  }

  protected async _mapManyToColumns(objects: (DeepPartial<T> | NewEntity<T>)[], transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType>[]> {
    return await toArrayAsync(mapAsync(objects, async (obj) => await this._mapToColumns(obj, transformContext)));
  }

  protected async _mapToColumns(obj: DeepPartial<T> | NewEntity<T>, transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType>> {
    const columns: Record = {};

    for (const def of this.#columnDefinitions) {
      const rawValue = def.dereferenceObjectPath(obj as Record);
      columns[def.name] = await def.toDatabase(rawValue, transformContext);
    }

    return columns as PgInsertValue<PgTableFromType>;
  }

  protected async _mapManyToInsertColumns(objects: (DeepPartial<T> | NewEntity<T>)[], transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType>[]> {
    return await toArrayAsync(mapAsync(objects, async (obj) => await this._mapToInsertColumns(obj, transformContext)));
  }

  protected async _mapToInsertColumns(obj: DeepPartial<T> | NewEntity<T>, transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType>> {
    const mapped = await this._mapToColumns(obj, transformContext);

    return {
      ...mapped,
      ...(
        this.hasMetadata
          ? {
            revision: 1,
            revisionTimestamp: TRANSACTION_TIMESTAMP,
            createTimestamp: TRANSACTION_TIMESTAMP,
          } satisfies PgUpdateSetSource<PgTableFromType<EntityType<Entity>>>
          : undefined
      ),
    };
  }

  protected async _mapUpdate(update: EntityUpdate<T>, transformContext: TransformContext): Promise<PgUpdateSetSource<PgTableFromType>> {
    const mappedUpdate: PgUpdateSetSource<PgTableFromType> = {};

    for (const column of this.#columnDefinitions) {
      const value = column.dereferenceObjectPath(update as EntityUpdate<Entity>);

      if (isUndefined(value)) {
        continue;
      }

      mappedUpdate[column.name as keyof PgUpdateSetSource<PgTableFromType>] = await column.toDatabase(value, transformContext);
    }

    return {
      ...mappedUpdate,
      ...this._getMetadataUpdate(update),

    } satisfies PgUpdateSetSource<PgTableFromType>;
  }

  protected _getMetadataUpdate(update?: EntityUpdate<T>): PgUpdateSetSource<PgTableFromType<EntityType<Entity>>> | undefined {
    return this.hasMetadata
      ? {
        attributes: this.getAttributesUpdate((update as EntityUpdate<Entity> | undefined)?.metadata?.attributes),
        revision: sql<number>`${this.#tableWithMetadata.revision} + 1`,
        revisionTimestamp: TRANSACTION_TIMESTAMP,
      } satisfies PgUpdateSetSource<PgTableFromType<EntityType<Entity>>>
      : undefined;
  }

  protected getIdLimitSelect(query: Query<T>) {
    const sqlQuery = this.convertQuery(query);

    return this.session.select({ id: this.#table.id })
      .from(this.#table)
      .where(sqlQuery)
      .limit(1);
  }

  protected async getTransformContext(): Promise<TransformContext> {
    if (isUndefined(this.#transformContext)) {
      if (isUndefined(this.#encryptionSecret)) {
        this.#transformContext = {};
        return this.#transformContext;
      }

      this.#transformContext = importSymmetricKey('AES-GCM', 256, this.#encryptionSecret, false).then((encryptionKey) => ({ encryptionKey }));

      const transformContext = await this.#transformContext;
      this.#transformContext = transformContext;
    }

    return await this.#transformContext;
  }
}

/**
 * Injects an EntityRepository instance for the specified entity type.
 * @template T The entity type.
 * @param type The entity type.
 * @returns An EntityRepository instance for the specified type.
 */
export function injectRepository<T extends Entity | EntityWithoutMetadata>(type: EntityType<T>, session?: Database | PgTransaction | null): EntityRepository<T> {
  return injectTransactional(EntityRepository<T>, session, type);
}

/**
 * Injects an EntityRepository instance for the specified entity type.
 * @template T The entity type.
 * @param type The entity type.
 * @returns An EntityRepository instance for the specified type.
 */
export async function injectRepositoryAsync<T extends Entity | EntityWithoutMetadata>(type: EntityType<T>, session?: Database | PgTransaction | null): Promise<EntityRepository<T>> {
  return await injectTransactionalAsync(EntityRepository<T>, session, type);
}

/**
 * Gets or creates a singleton EntityRepository class for the specified entity type.
 * @template T The entity type.
 * @param type The entity type.
 * @returns A singleton EntityRepository class for the specified type.
 */
export function getRepository<T extends Entity | EntityWithoutMetadata>(type: EntityType<T>): Type<EntityRepository<T>> {
  const className = `${type.name}Service`;

  const entityRepositoryClass = {
    [className]: class extends EntityRepository<T> {
      static [entityTypeToken] = type;
    },
  }[className]!;

  Singleton()(entityRepositoryClass);

  return entityRepositoryClass;
}
