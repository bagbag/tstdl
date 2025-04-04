/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { and, asc, count, desc, eq, inArray, isNull, isSQLWrapper, SQL, sql } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction as DrizzlePgTransaction, type PgColumn, type PgInsertValue, type PgQueryResultHKT, type PgUpdateSetSource } from 'drizzle-orm/pg-core';

import { createContextProvider } from '#/context/context.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { Singleton } from '#/injector/decorators.js';
import { Injector } from '#/injector/index.js';
import { inject, injectArgument, runInInjectionContext } from '#/injector/inject.js';
import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { JsonPath } from '#/json-path/index.js';
import { Schema } from '#/schema/schema.js';
import type { DeepPartial, OneOrMany, Paths, Record, Type } from '#/types.js';
import type { UntaggedDeep } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { importSymmetricKey } from '#/utils/cryptography.js';
import { typeExtends } from '#/utils/index.js';
import { fromDeepObjectEntries, fromEntries, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isArray, isDefined, isString, isUndefined } from '#/utils/type-guards.js';
import { Entity, type EntityMetadataAttributes, type EntityType, type EntityWithoutMetadata } from '../entity.js';
import type { Query } from '../query.js';
import type { EntityMetadataUpdate, EntityUpdate, LoadManyOptions, LoadOptions, NewEntity, Order } from '../repository.types.js';
import { TRANSACTION_TIMESTAMP } from '../sqls.js';
import { Database } from './database.js';
import { getColumnDefinitions, getDrizzleTableFromType } from './drizzle/schema-converter.js';
import { convertQuery } from './query-converter.js';
import { ENCRYPTION_SECRET } from './tokens.js';
import { DrizzleTransaction, type Transaction, type TransactionConfig } from './transaction.js';
import type { ColumnDefinition, PgTableFromType, TransformContext } from './types.js';

type PgTransaction = DrizzlePgTransaction<PgQueryResultHKT, Record, Record>;

export const repositoryType: unique symbol = Symbol('repositoryType');

export class EntityRepositoryConfig {
  schema: string;
}

export type TransactionHandler<T extends EntityRepository<any>, R> = (repository: T, transaction: Transaction) => Promise<R>;

const entityTypeToken = Symbol('EntityType');

type EntityRepositoryContext = {
  type: EntityType,
  table: PgTableFromType,
  columnDefinitions: ColumnDefinition[],
  columnDefinitionsMap: Map<string, ColumnDefinition>,
  session: PgTransaction,
  encryptionSecret: Uint8Array | undefined,
  transformContext: TransformContext | Promise<TransformContext> | undefined
};

type InferSelect<T extends Entity | EntityWithoutMetadata = Entity | EntityWithoutMetadata> = PgTableFromType<EntityType<T>>['$inferSelect'];

const { getCurrentEntityRepositoryContext, runInEntityRepositoryContext, isInEntityRepositoryContext } = createContextProvider<EntityRepositoryContext, 'EntityRepository'>('EntityRepository');

@Singleton()
export class EntityRepository<T extends Entity | EntityWithoutMetadata = EntityWithoutMetadata> implements Resolvable<EntityType<T>> {
  readonly #context = getCurrentEntityRepositoryContext() ?? {} as Partial<EntityRepositoryContext>;
  readonly #injector = inject(Injector);
  readonly #repositoryConstructor: Type<this, []>;
  readonly #withTransactionCache = new WeakMap<Transaction, this>();
  readonly #encryptionSecret = isInEntityRepositoryContext() ? this.#context.encryptionSecret : inject(ENCRYPTION_SECRET, undefined, { optional: true });

  #transformContext: TransformContext | Promise<TransformContext> | undefined = this.#context.transformContext;

  readonly type = (this.#context.type as EntityType<T> | undefined) ?? injectArgument(this, { optional: true }) ?? assertDefinedPass((this.constructor as Record)[entityTypeToken] as EntityType<T>, 'Missing entity type.');
  readonly typeName = this.type.entityName ?? this.type.name;
  readonly #table = this.#context.table ?? getDrizzleTableFromType(this.type as EntityType, inject(EntityRepositoryConfig, undefined, { optional: true })?.schema);
  readonly #tableWithMetadata = this.#table as PgTableFromType<EntityType<Entity>>;
  readonly #columnDefinitions = this.#context.columnDefinitions ?? getColumnDefinitions(this.#table);
  readonly #columnDefinitionsMap = this.#context.columnDefinitionsMap ?? new Map(this.#columnDefinitions.map((column) => [column.objectPath.path, column]));
  readonly session = this.#context.session ?? inject(Database);
  readonly isInTransaction = this.session instanceof DrizzlePgTransaction;
  readonly hasMetadata = typeExtends(this.type, Entity);

  get table(): PgTableFromType<EntityType<T>> {
    return this.#table as PgTableFromType<EntityType<T>>;
  }

  protected get isFork(): boolean {
    return this.isInTransaction;
  }

  declare readonly [resolveArgumentType]: EntityType<T>;

  constructor() {
    this.#repositoryConstructor = new.target as Type<this, []>;
  }

  withOptionalTransaction(transaction: Transaction | undefined): this {
    if (isUndefined(transaction)) {
      return this;
    }

    return this.withTransaction(transaction);
  }

  withTransaction(transaction: Transaction): this {
    if (this.#withTransactionCache.has(transaction)) {
      return this.#withTransactionCache.get(transaction)!;
    }

    const context: EntityRepositoryContext = {
      type: this.type,
      table: this.#table,
      columnDefinitions: this.#columnDefinitions,
      columnDefinitionsMap: this.#columnDefinitionsMap,
      session: (transaction as DrizzleTransaction).transaction,
      encryptionSecret: this.#encryptionSecret,
      transformContext: this.#transformContext
    };

    const repositoryWithTransaction = runInInjectionContext(this.#injector, () => runInEntityRepositoryContext(context, () => new this.#repositoryConstructor()));

    this.#withTransactionCache.set(transaction, repositoryWithTransaction);

    return repositoryWithTransaction;
  }

  async startTransaction(config?: TransactionConfig): Promise<Transaction> {
    return DrizzleTransaction.create(this.session, config);
  }

  async useTransaction<R>(transaction: Transaction | undefined, handler: TransactionHandler<this, R>): Promise<R> {
    if (isUndefined(transaction)) {
      return this.transaction(handler);
    }

    const repository = this.withTransaction(transaction);
    return (transaction as DrizzleTransaction).use(async () => handler(repository, transaction));
  }

  async transaction<R>(handler: TransactionHandler<this, R>, config?: TransactionConfig): Promise<R> {
    const transaction = await DrizzleTransaction.create(this.session, config);
    const repository = this.withTransaction(transaction);

    return transaction.use(async () => handler(repository, transaction));
  }

  async load(id: string): Promise<T> {
    const entity = await this.tryLoad(id);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

  async tryLoad(id: string): Promise<T | undefined> {
    return this.tryLoadByQuery(eq(this.#table.id, id));
  }

  async loadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T> {
    const entity = await this.tryLoadByQuery(query, options);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

  async tryLoadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(query);

    let dbQuery = this.session.select()
      .from(this.#table)
      .where(sqlQuery)
      .offset(options?.offset!)
      .$dynamic();

    if (isDefined(options?.order)) {
      dbQuery = dbQuery.orderBy(...this.convertOrderBy(options.order));
    }

    const [row] = await dbQuery;

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async loadMany(ids: string[], options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery(inArray(this.#table.id, ids), options);
  }

  async *loadManyCursor(ids: string[], options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadMany(ids, options);
    yield* entities;
  }

  async loadManyByQuery(query: Query<T>, options?: LoadManyOptions<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    let dbQuery = this.session.select()
      .from(this.#table)
      .where(sqlQuery)
      .orderBy()
      .offset(options?.offset!)
      .limit(options?.limit!)
      .$dynamic();

    if (isDefined(options?.order)) {
      dbQuery = dbQuery.orderBy(...this.convertOrderBy(options.order));
    }

    const rows = await dbQuery;

    return this.mapManyToEntity(rows);
  }

  async *loadManyByQueryCursor(query: Query<T>, options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadManyByQuery(query, options);
    yield* entities;
  }

  async loadAll(options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery({}, options);
  }

  async *loadAllCursor(options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadAll(options);
    yield* entities;
  }

  async count(): Promise<number> {
    const sqlQuery = this.convertQuery({});

    const dbQuery = this.session
      .select({ count: count() })
      .from(this.#table)
      .where(sqlQuery);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async countByQuery(query: Query<T>): Promise<number> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session
      .select({ count: count() })
      .from(this.#table)
      .where(sqlQuery);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async has(id: string): Promise<boolean> {
    return this.hasByQuery(eq(this.#table.id, id));
  }

  async hasByQuery(query: Query<T>): Promise<boolean> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session
      .select({ exists: sql<boolean>`SELECT EXISTS(SELECT 1 FROM ${this.#table} WHERE ${sqlQuery})` })
      .from(this.#table);

    const [result] = await dbQuery;
    return assertDefinedPass(result).exists;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const sqlQuery = this.convertQuery({});

    const result = await this.session
      .select({ contains: sql<boolean>`array_agg(${this.#table.id}) @> ${ids}`.as('contains') })
      .from(this.#table)
      .where(sqlQuery);

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

    return this.mapToEntity(row);
  }

  async insert(entity: NewEntity<T>): Promise<T> {
    const columns = await this.mapToInsertColumns(entity);

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .returning();

    return this.mapToEntity(row!);
  }

  async insertMany(entities: NewEntity<T>[]): Promise<T[]> {
    const columns = await this.mapManyToInsertColumns(entities);
    const rows = await this.session.insert(this.#table).values(columns).returning();

    return this.mapManyToEntity(rows);
  }

  async upsert(target: OneOrMany<Paths<UntaggedDeep<T>>>, entity: NewEntity<T>, update?: EntityUpdate<T>): Promise<T> {
    const targetColumns = toArray(target).map((path) => this.getColumn(path));

    const columns = await this.mapToInsertColumns(entity);
    const mappedUpdate = await this.mapUpdate(update ?? (entity as EntityUpdate<T>));

    const [row] = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return this.mapToEntity(row!);
  }

  async upsertMany(target: OneOrMany<Paths<UntaggedDeep<T>>>, entities: NewEntity<T>[], update?: EntityUpdate<T>): Promise<T[]> {
    const targetColumns = toArray(target).map((path) => this.getColumn(path));

    const columns = await this.mapManyToInsertColumns(entities);
    const mappedUpdate = isDefined(update)
      ? await this.mapUpdate(update)
      : {
        ...fromEntries(this.#columnDefinitions.map((column) => [column.name, sql`excluded.${sql.identifier(this.getColumn(column).name)}`] as const)),
        ...this._getMetadataUpdate(update)
      };

    const rows = await this.session
      .insert(this.#table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return this.mapManyToEntity(rows);
  }

  async update(id: string, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdate(id, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

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

    return this.mapToEntity(row);
  }

  async updateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdateByQuery(query, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

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

    return this.mapToEntity(row);
  }

  async updateMany(ids: string[], update: EntityUpdate<T>): Promise<T[]> {
    return this.updateManyByQuery(inArray(this.#table.id, ids), update);
  }

  async updateManyByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);
    const mappedUpdate = await this.mapUpdate(update);

    const rows = await this.session
      .update(this.#table)
      .set(mappedUpdate)
      .where(sqlQuery)
      .returning();

    return this.mapManyToEntity(rows);
  }

  async delete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDelete(id, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return entity;
  }

  async tryDelete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    if (!this.hasMetadata) {
      return this.tryHardDelete(id);
    }

    const sqlQuery = this.convertQuery(eq(this.#table.id, id));

    const [row] = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(sqlQuery)
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async deleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDeleteByQuery(query, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return entity;
  }

  async tryDeleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    if (!this.hasMetadata) {
      return this.tryHardDeleteByQuery(query);
    }

    const idQuery = this.getIdLimitSelect(query);

    const [row] = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(inArray(this.#table.id, idQuery.for('update')))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async deleteMany(ids: string[], metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    return this.deleteManyByQuery(inArray(this.#table.id, ids), metadataUpdate);
  }

  async deleteManyByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    if (!this.hasMetadata) {
      return this.hardDeleteManyByQuery(query);
    }

    const sqlQuery = this.convertQuery(query);

    const rows = await this.session
      .update(this.#tableWithMetadata)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(sqlQuery)
      .returning();

    return this.mapManyToEntity(rows);
  }

  async hardDelete(id: string): Promise<T> {
    const result = await this.tryHardDelete(id);

    if (!result) {
      throw new NotFoundError(`${this.typeName} ${id} not found.`);
    }

    return result;
  }

  async tryHardDelete(id: string): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(eq(this.#table.id, id));

    const [row] = await (this.session as NodePgDatabase)
      .delete(this.#table)
      .where(sqlQuery)
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async hardDeleteByQuery(query: Query<T>): Promise<T> {
    const result = await this.tryHardDeleteByQuery(query);

    if (!result) {
      throw new NotFoundError(`${this.typeName} not found.`);
    }

    return result;
  }

  async tryHardDeleteByQuery(query: Query<T>): Promise<T | undefined> {
    const idQuery = this.getIdLimitSelect(query);

    const [row] = await (this.session as NodePgDatabase)
      .delete(this.#table)
      .where(inArray(this.#table.id, idQuery.for('update')))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async hardDeleteMany(ids: string[]): Promise<T[]> {
    return this.hardDeleteManyByQuery(inArray(this.#table.id, ids));
  }

  async hardDeleteManyByQuery(query: Query<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    const rows = await (this.session as NodePgDatabase)
      .delete(this.#table)
      .where(sqlQuery)
      .returning();

    return this.mapManyToEntity(rows);
  }

  getColumn(pathOrColumn: Paths<UntaggedDeep<T>> | ColumnDefinition): PgColumn {
    if (isString(pathOrColumn)) {
      const columnName = assertDefinedPass(this.#columnDefinitionsMap.get(pathOrColumn), `Could not map ${pathOrColumn} to column.`).name;
      return this.#table[columnName as keyof PgTableFromType] as PgColumn;
    }

    return this.#table[pathOrColumn.name as keyof PgTableFromType] as PgColumn;
  }

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

  convertQuery(query: Query<T>, options?: { withDeleted?: boolean }): SQL {
    let sql = convertQuery(query, this.#table, this.#columnDefinitionsMap);

    if (!this.hasMetadata || (options?.withDeleted == true)) {
      return sql;
    }

    return and(isNull(this.#tableWithMetadata.deleteTimestamp), sql)!;
  }

  async mapManyToEntity(columns: InferSelect[]): Promise<T[]> {
    const transformContext = await this.getTransformContext();
    return this._mapManyToEntity(columns as any as InferSelect[], transformContext);
  }

  async mapToEntity(columns: InferSelect): Promise<T> {
    const transformContext = await this.getTransformContext();
    return this._mapToEntity(columns as any as InferSelect, transformContext);
  }

  async mapManyToColumns(objects: (DeepPartial<T> | NewEntity<T>)[]): Promise<PgInsertValue<PgTableFromType>[]> {
    const transformContext = await this.getTransformContext();
    return this._mapManyToColumns(objects, transformContext);
  }

  async mapToColumns(obj: DeepPartial<T> | NewEntity<T>): Promise<PgInsertValue<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return this._mapToColumns(obj, transformContext);
  }

  async mapManyToInsertColumns(objects: (DeepPartial<T> | NewEntity<T>)[]): Promise<PgInsertValue<PgTableFromType>[]> {
    const transformContext = await this.getTransformContext();
    return this._mapManyToInsertColumns(objects, transformContext);
  }

  async mapToInsertColumns(obj: DeepPartial<T> | NewEntity<T>): Promise<PgInsertValue<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return this._mapToInsertColumns(obj, transformContext);
  }

  async mapUpdate(update: EntityUpdate<T>): Promise<PgUpdateSetSource<PgTableFromType>> {
    const transformContext = await this.getTransformContext();
    return this._mapUpdate(update, transformContext);
  }

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
    return toArrayAsync(mapAsync(columns, async (column) => this._mapToEntity(column, transformContext)));
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
    return toArrayAsync(mapAsync(objects, async (obj) => this._mapToColumns(obj, transformContext)));
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
    return toArrayAsync(mapAsync(objects, async (obj) => this._mapToInsertColumns(obj, transformContext)));
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
            createTimestamp: TRANSACTION_TIMESTAMP
          } satisfies PgUpdateSetSource<PgTableFromType<EntityType<Entity>>>
          : undefined
      )
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
      ...this._getMetadataUpdate(update)

    } satisfies PgUpdateSetSource<PgTableFromType>;
  }

  protected _getMetadataUpdate(update?: EntityUpdate<T>): PgUpdateSetSource<PgTableFromType<EntityType<Entity>>> | undefined {
    return this.hasMetadata
      ? {
        attributes: this.getAttributesUpdate((update as EntityUpdate<Entity> | undefined)?.metadata?.attributes),
        revision: sql<number>`${this.#tableWithMetadata.revision} + 1`,
        revisionTimestamp: TRANSACTION_TIMESTAMP
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

    return this.#transformContext;
  }
}

export function injectRepository<T extends Entity | EntityWithoutMetadata>(type: EntityType<T>): EntityRepository<T> {
  return inject(EntityRepository<T>, type);
}

export function getRepository<T extends Entity | EntityWithoutMetadata>(type: EntityType<T>): Type<EntityRepository<T>> {
  const className = `${type.name}Service`;

  const entityRepositoryClass = {
    [className]: class extends EntityRepository<T> {
      static [entityTypeToken] = type;
    }
  }[className]!;

  Singleton()(entityRepositoryClass);

  return entityRepositoryClass;
}
