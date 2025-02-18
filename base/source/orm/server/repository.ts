/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction as DrizzlePgTransaction, type PgColumn, type PgInsertValue, type PgQueryResultHKT, type PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { PartialDeep } from 'type-fest';

import { NotFoundError } from '#/errors/not-found.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import { Schema } from '#/schema/schema.js';
import type { DeepPartial, OneOrMany, Paths, Record, Type, TypedOmit } from '#/types.js';
import type { UntaggedDeep } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { fromDeepObjectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, assertNotNullPass, isNotNull, isUndefined } from '#/utils/type-guards.js';
import type { Entity, EntityMetadata, EntityMetadataAttributes, EntityType, NewEntity } from '../entity.js';
import type { Query } from '../query.js';
import { Database } from './database.js';
import { type ColumnDefinition, getColumnDefinitions, getDrizzleTableFromType, type PgTableFromType } from './drizzle/schema-converter.js';
import { convertQuery } from './query-converter.js';
import { DrizzleTransaction, type Transaction, type TransactionConfig } from './transaction.js';

type PgTransaction = DrizzlePgTransaction<PgQueryResultHKT, Record, Record>;

export const repositoryType: unique symbol = Symbol('repositoryType');

export type OrderOptions<T extends Entity> = { order?: Partial<Record<Paths<T>, 1 | -1 | 'asc' | 'desc'>> };

export type LoadOptions<T extends Entity> = OrderOptions<T> & { offset?: number, withDeleted?: boolean };
export type LoadManyOptions<T extends Entity> = LoadOptions<T> & { limit?: number };

export type UpdateOptions<T extends Entity> = LoadOptions<T>;

export type EntityMetadataUpdate = Partial<UntaggedDeep<Pick<EntityMetadata, 'attributes'>>>;

export type EntityUpdate<T extends Entity> = PartialDeep<UntaggedDeep<TypedOmit<T, 'metadata'> & { metadata: EntityMetadataUpdate }>>;

export class EntityRepositoryConfig {
  schema: string;
}

export type TransactionHandler<T extends Entity, R> = (repository: EntityRepository<T>, transaction: Transaction) => Promise<R>;

type RepositoryConstructor<T extends Entity> = new (...repository: ConstructorParameters<typeof EntityRepository<T>>) => EntityRepository<T>;

const TRANSACTION_TIMESTAMP = sql<Date>`transaction_timestamp()`;

@Singleton({
  provider: {
    useFactory: () => new EntityRepository()
  }
})
export class EntityRepository<T extends Entity = Entity> implements Resolvable<EntityType<T>> {
  readonly #repositoryConstructor: RepositoryConstructor<T>;
  readonly #withTransactionCache = new WeakMap<Transaction, EntityRepository<T>>();

  readonly type: EntityType<T>;
  readonly table: PgTableFromType<string, EntityType>;
  readonly columnDefinitions: ColumnDefinition[];
  readonly columnDefinitionsMap: Map<string, ColumnDefinition>;
  readonly session: Database | PgTransaction;
  readonly isInTransaction: boolean;

  get tx(): PgTransaction {
    return (this.session as PgTransaction);
  }

  declare readonly [resolveArgumentType]: EntityType<T>;

  constructor(type?: EntityType<T>, table?: PgTableFromType<string, EntityType>, columnDefinitions?: ColumnDefinition[], columnDefinitionsMap?: Map<string, ColumnDefinition>, session?: Database | PgTransaction) {
    this.#repositoryConstructor = new.target as RepositoryConstructor<T>;

    this.type = type ?? injectArgument(this);
    this.table = table ?? getDrizzleTableFromType(this.type as EntityType, inject(EntityRepositoryConfig).schema);
    this.columnDefinitions = columnDefinitions ?? getColumnDefinitions(this.table);
    this.columnDefinitionsMap = columnDefinitionsMap ?? new Map(this.columnDefinitions.map((column) => [column.objectPath.path, column]));
    this.session = session ?? inject(Database);
    this.isInTransaction = this.session instanceof DrizzlePgTransaction;
  }

  withOptionalTransaction(transaction: Transaction | undefined): EntityRepository<T> {
    if (isUndefined(transaction)) {
      return this;
    }

    return this.withTransaction(transaction);
  }

  withTransaction(transaction: Transaction): EntityRepository<T> {
    if (this.#withTransactionCache.has(transaction)) {
      return this.#withTransactionCache.get(transaction)!;
    }

    const repositoryWithTransaction = new this.#repositoryConstructor(this.type, this.table, this.columnDefinitions, this.columnDefinitionsMap, (transaction as DrizzleTransaction).transaction);
    this.#withTransactionCache.set(transaction, repositoryWithTransaction);

    return repositoryWithTransaction;
  }

  async startTransaction(config?: TransactionConfig): Promise<Transaction> {
    return DrizzleTransaction.create(this.session, config);
  }

  async useTransaction<R>(transaction: Transaction | undefined, handler: TransactionHandler<T, R>): Promise<R> {
    if (isUndefined(transaction)) {
      return this.transaction(handler);
    }

    const repository = this.withTransaction(transaction);
    return (transaction as DrizzleTransaction).use(async () => handler(repository, transaction));
  }

  async transaction<R>(handler: TransactionHandler<T, R>, config?: TransactionConfig): Promise<R> {
    const transaction = await DrizzleTransaction.create(this.session, config);
    const repository = this.withTransaction(transaction);

    return transaction.use(async () => handler(repository, transaction));
  }

  async load(id: string): Promise<T> {
    const entity = await this.tryLoad(id);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }

    return entity;
  }

  async tryLoad(id: string): Promise<T | undefined> {
    return this.tryLoadByQuery(eq(this.table.id, id));
  }

  async loadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T> {
    const entity = await this.tryLoadByQuery(query, options);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} not found.`);
    }

    return entity;
  }

  async tryLoadByQuery(query: Query<T>, options?: LoadOptions<T>): Promise<T | undefined> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session.select()
      .from(this.table)
      .where(sqlQuery)
      .offset(options?.offset!);

    const [row] = await dbQuery;

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async loadMany(ids: string[], options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery(inArray(this.table.id, ids), options);
  }

  async * loadManyCursor(ids: string[], options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadMany(ids, options);
    yield* entities;
  }

  async loadManyByQuery(query: Query<T>, options?: LoadManyOptions<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    const rows = await this.session.select()
      .from(this.table)
      .where(sqlQuery)
      .offset(options?.offset!)
      .limit(options?.limit!);

    return rows.map((entity) => this.mapToEntity(entity));
  }

  async * loadManyByQueryCursor(query: Query<T>, options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadManyByQuery(query, options);
    yield* entities;
  }

  async loadAll(options?: LoadManyOptions<T>): Promise<T[]> {
    return this.loadManyByQuery({}, options);
  }

  async * loadAllCursor(options?: LoadManyOptions<T>): AsyncIterableIterator<T> {
    const entities = await this.loadAll(options);
    yield* entities;
  }

  async count(): Promise<number> {
    const dbQuery = this.session
      .select({ count: count() })
      .from(this.table);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async countByQuery(query: Query<T>): Promise<number> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session
      .select({ count: count() })
      .from(this.table)
      .where(sqlQuery);

    const [result] = await dbQuery;
    return assertDefinedPass(result).count;
  }

  async has(id: string): Promise<boolean> {
    return this.hasByQuery(eq(this.table.id, id));
  }

  async hasByQuery(query: Query<T>): Promise<boolean> {
    const sqlQuery = this.convertQuery(query);

    const dbQuery = this.session
      .select({ exists: sql<boolean>`SELECT EXISTS(SELECT 1 FROM ${this.table} WHERE ${sqlQuery})` })
      .from(this.table);

    const [result] = await dbQuery;
    return assertDefinedPass(result).exists;
  }

  async hasAll(ids: string[]): Promise<boolean> {
    const result = await this.session
      .select({ contains: sql<boolean>`array_agg(${this.table.id}) @> ${ids}`.as('contains') })
      .from(this.table);

    return assertDefinedPass(result[0]).contains;
  }

  async insert(entity: NewEntity<T>): Promise<T> {
    const columns = this.mapToInsertColumns(entity);

    const [row] = await this.session
      .insert(this.table)
      .values(columns)
      .returning();

    return this.mapToEntity(row!);
  }

  async insertMany(entities: NewEntity<T>[]): Promise<T[]> {
    const columns = entities.map((entity) => this.mapToInsertColumns(entity));
    const rows = await this.session.insert(this.table).values(columns).returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async upsert(target: OneOrMany<Extract<keyof T, string>>, entity: NewEntity<T>, update?: EntityUpdate<T>): Promise<T> {
    const targetColumns = toArray(target).map((path) => {
      const columnName = assertDefinedPass(this.columnDefinitionsMap.get(path), `Could not map ${path} to column.`).name;
      return this.table[columnName as keyof PgTableFromType<string, EntityType>] as PgColumn;
    });

    const columns = this.mapToInsertColumns(entity);
    const mappedUpdate = this.mapUpdate(update ?? (entity as EntityUpdate<T>));

    const [row] = await this.session
      .insert(this.table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return this.mapToEntity(row!);
  }

  async upsertMany(target: OneOrMany<Extract<keyof T, string>>, entities: NewEntity<T>[], update: EntityUpdate<T>): Promise<T[]> {
    const targetColumns = toArray(target).map((path) => {
      const columnName = assertDefinedPass(this.columnDefinitionsMap.get(path), `Could not map ${path} to column.`).name;
      return this.table[columnName as keyof PgTableFromType<string, EntityType>] as PgColumn;
    });

    const columns = entities.map((entity) => this.mapToColumns(entity));
    const mappedUpdate = this.mapUpdate(update);

    const rows = await this.session
      .insert(this.table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async update(id: string, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdate(id, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }

    return entity;
  }

  async tryUpdate(id: string, update: EntityUpdate<T>): Promise<T | undefined> {
    const mappedUpdate = this.mapUpdate(update);

    const [row] = await this.session
      .update(this.table)
      .set(mappedUpdate)
      .where(eq(this.table.id, id))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async updateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdateByQuery(query, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} not found.`);
    }

    return entity;
  }

  async tryUpdateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T | undefined> {
    const mappedUpdate = this.mapUpdate(update);
    const idQuery = this.getIdLimitQuery(query);

    const [row] = await this.session
      .with(idQuery)
      .update(this.table)
      .set(mappedUpdate)
      .where(inArray(this.table.id, idQuery))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async updateMany(ids: string[], update: EntityUpdate<T>): Promise<T[]> {
    return this.updateManyByQuery(inArray(this.table.id, ids), update);
  }

  async updateManyByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);
    const mappedUpdate = this.mapUpdate(update);

    const rows = await this.session
      .update(this.table)
      .set(mappedUpdate)
      .where(sqlQuery)
      .returning();

    return rows.map((entity) => this.mapToEntity(entity));
  }

  async delete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDelete(id, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }

    return entity;
  }

  async tryDelete(id: string, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    const [row] = await this.session
      .update(this.table)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(eq(this.table.id, id))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async deleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T> {
    const entity = await this.tryDeleteByQuery(query, metadataUpdate);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} not found.`);
    }

    return entity;
  }

  async tryDeleteByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T | undefined> {
    const idQuery = this.getIdLimitQuery(query);

    const [row] = await this.session
      .update(this.table)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(inArray(this.table.id, idQuery))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row);
  }

  async deleteMany(ids: string[], metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    return this.deleteManyByQuery(inArray(this.table.id, ids), metadataUpdate);
  }

  async deleteManyByQuery(query: Query<T>, metadataUpdate?: EntityMetadataUpdate): Promise<T[]> {
    const sqlQuery = this.convertQuery(query);

    const rows = await this.session
      .update(this.table)
      .set({
        deleteTimestamp: TRANSACTION_TIMESTAMP,
        attributes: this.getAttributesUpdate(metadataUpdate?.attributes)
      })
      .where(sqlQuery)
      .returning();

    return rows.map((row) => this.mapToEntity(row));
  }

  async hardDelete(id: string): Promise<void> {
    const result = await this.tryHardDelete(id);

    if (!result) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }
  }

  async tryHardDelete(id: string): Promise<boolean> {
    const result = await (this.session as NodePgDatabase).delete(this.table).where(eq(this.table.id, id));

    console.log({ deleteResult: result });
    return isNotNull(result.rowCount) && (result.rowCount > 0);
  }

  async hardDeleteByQuery(query: Query<T>): Promise<boolean> {
    const idQuery = this.getIdLimitQuery(query);

    const result = await (this.session as NodePgDatabase)
      .with(idQuery)
      .delete(this.table)
      .where(inArray(this.table.id, idQuery));

    console.log({ deleteResult: result });
    return isNotNull(result.rowCount) && (result.rowCount > 0);
  }

  async hardDeleteMany(ids: string[]): Promise<number> {
    return this.hardDeleteManyByQuery(inArray(this.table.id, ids));
  }

  async hardDeleteManyByQuery(query: Query<T>): Promise<number> {
    const sqlQuery = this.convertQuery(query);
    const result = await (this.session as NodePgDatabase).delete(this.table).where(sqlQuery);

    console.log({ deleteResult: result });
    return assertNotNullPass(result.rowCount);
  }

  protected convertQuery(query: Query<T>): SQL {
    return convertQuery(query, this.table, this.columnDefinitionsMap);
  }

  protected mapToEntity(columns: this['table']['$inferSelect']): T {
    const entries = this.columnDefinitions.map((def) => [def.objectPath, columns[def.name as keyof this['table']['$inferSelect']]] as const);
    const obj = fromDeepObjectEntries(entries);

    return Schema.parse(this.type, obj);
  }

  protected mapToColumns(obj: DeepPartial<T> | NewEntity<T>): PgInsertValue<PgTableFromType<string, EntityType>> {
    const columns: Record = {};

    for (const def of this.columnDefinitions) {
      columns[def.name] = def.dereferenceObjectPath(obj as Record);
    }

    return columns as PgInsertValue<PgTableFromType<string, EntityType>>;
  }

  protected mapToInsertColumns(obj: DeepPartial<T> | NewEntity<T>): PgInsertValue<PgTableFromType<string, EntityType>> {
    const mapped = this.mapToColumns(obj);

    return {
      ...mapped,
      revision: 1,
      revisionTimestamp: TRANSACTION_TIMESTAMP,
      createTimestamp: TRANSACTION_TIMESTAMP
    };
  }

  protected mapUpdate(update: EntityUpdate<T>): PgUpdateSetSource<PgTableFromType<string, EntityType>> {
    const mappedUpdate: PgUpdateSetSource<PgTableFromType<string, EntityType>> = {};

    for (const column of this.columnDefinitions) {
      const value = column.dereferenceObjectPath(update as EntityUpdate<Entity>);

      if (isUndefined(value)) {
        continue;
      }

      mappedUpdate[column.name as keyof PgUpdateSetSource<PgTableFromType<string, EntityType>>] = value;
    }

    return {
      ...mappedUpdate,
      attributes: this.getAttributesUpdate((update as EntityUpdate<Entity>).metadata?.attributes),
      revision: sql<number>`${this.table.revision} + 1`,
      revisionTimestamp: sql<Date>`transaction_timestamp()`
    } satisfies PgUpdateSetSource<PgTableFromType<string, EntityType>>;
  }

  protected getIdLimitQuery(query: Query<T>) {
    const sqlQuery = this.convertQuery(query);

    return this.session.$with('id').as(
      this.session.select({ id: this.table.id })
        .from(this.table)
        .where(sqlQuery)
        .limit(1)
    );
  }

  protected getAttributesUpdate(attributes: EntityMetadataAttributes | undefined) {
    if (isUndefined(attributes)) {
      return undefined;
    }

    return sql`${this.table.attributes} || '${JSON.stringify(attributes)}'::jsonb`;
  }
}

export function injectRepository<T extends Entity>(type: EntityType<T>): EntityRepository<T> {
  return inject(EntityRepository<T>, type);
}

export function getRepository<T extends Entity>(type: EntityType<T>, config: EntityRepositoryConfig): Type<EntityRepository<T>> {
  const className = `${type.name}Service`;

  const entityRepositoryClass = {
    [className]: class extends EntityRepository<T> { }
  }[className]!;

  const injectorDecorator = Singleton({ providers: [{ provide: EntityRepositoryConfig, useValue: config }] });

  injectorDecorator(entityRepositoryClass);

  return entityRepositoryClass;
}
