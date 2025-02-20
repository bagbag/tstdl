/* eslint-disable @typescript-eslint/no-non-null-asserted-optional-chain */

import { count, eq, inArray, sql, type SQL } from 'drizzle-orm';
import type { NodePgDatabase } from 'drizzle-orm/node-postgres';
import { PgTransaction as DrizzlePgTransaction, type PgColumn, type PgInsertValue, type PgQueryResultHKT, type PgUpdateSetSource } from 'drizzle-orm/pg-core';
import type { PartialDeep } from 'type-fest';

import { createContextProvider } from '#/context/context.js';
import { NotFoundError } from '#/errors/not-found.error.js';
import { Singleton } from '#/injector/decorators.js';
import { inject, injectArgument } from '#/injector/inject.js';
import { type Resolvable, resolveArgumentType } from '#/injector/interfaces.js';
import type { JsonPath } from '#/json-path/index.js';
import { Schema } from '#/schema/schema.js';
import type { DeepPartial, OneOrMany, Paths, Record, Type, TypedOmit } from '#/types.js';
import type { UntaggedDeep } from '#/types/index.js';
import { toArray } from '#/utils/array/array.js';
import { mapAsync } from '#/utils/async-iterable-helpers/map.js';
import { toArrayAsync } from '#/utils/async-iterable-helpers/to-array.js';
import { importSymmetricKey } from '#/utils/cryptography.js';
import { fromDeepObjectEntries } from '#/utils/object/object.js';
import { assertDefined, assertDefinedPass, assertNotNullPass, isNotNull, isUndefined } from '#/utils/type-guards.js';
import type { Entity, EntityMetadata, EntityMetadataAttributes, EntityType, NewEntity } from '../entity.js';
import type { Query } from '../query.js';
import { Database } from './database.js';
import { getColumnDefinitions, getDrizzleTableFromType } from './drizzle/schema-converter.js';
import { convertQuery } from './query-converter.js';
import { ENCRYPTION_SECRET } from './tokens.js';
import { DrizzleTransaction, type Transaction, type TransactionConfig } from './transaction.js';
import type { ColumnDefinition, PgTableFromType, TransformContext } from './types.js';

type PgTransaction = DrizzlePgTransaction<PgQueryResultHKT, Record, Record>;

export const repositoryType: unique symbol = Symbol('repositoryType');

export type OrderOptions<T extends Entity> = { order?: Partial<Record<Paths<UntaggedDeep<T>>, 1 | -1 | 'asc' | 'desc'>> };

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

const entityTypeToken = Symbol('EntityType');

const TRANSACTION_TIMESTAMP = sql<Date>`transaction_timestamp()`;

type EntityRepositoryContext = {
  type: EntityType,
  table: PgTableFromType<string, EntityType>,
  columnDefinitions: ColumnDefinition[],
  columnDefinitionsMap: Map<string, ColumnDefinition>,
  session: Database | PgTransaction,
  encryptionSecret: Uint8Array | undefined,
  transformContext: TransformContext | Promise<TransformContext> | undefined
};

const { getCurrentEntityRepositoryContext, runInEntityRepositoryContext, isInEntityRepositoryContext } = createContextProvider<EntityRepositoryContext, 'EntityRepository'>('EntityRepository');

@Singleton()
export class EntityRepository<T extends Entity = Entity> implements Resolvable<EntityType<T>> {
  readonly #repositoryConstructor: RepositoryConstructor<T>;
  readonly #withTransactionCache = new WeakMap<Transaction, EntityRepository<T>>();
  readonly #encryptionSecret = isInEntityRepositoryContext() ? getCurrentEntityRepositoryContext()?.encryptionSecret : inject(ENCRYPTION_SECRET, undefined, { optional: true });

  #transformContext: TransformContext | Promise<TransformContext> | undefined;

  readonly type: EntityType<T>;
  readonly table: PgTableFromType<string, EntityType>;
  readonly columnDefinitions: ColumnDefinition[];
  readonly columnDefinitionsMap: Map<string, ColumnDefinition>;
  readonly session: Database | PgTransaction;
  readonly isInTransaction: boolean;

  declare readonly [resolveArgumentType]: EntityType<T>;

  constructor() {
    this.#repositoryConstructor = new.target as RepositoryConstructor<T>;

    const {
      type,
      table,
      columnDefinitions,
      columnDefinitionsMap,
      session,
      transformContext
    } = getCurrentEntityRepositoryContext() ?? {};

    this.type = (type as EntityType<T> | undefined) ?? injectArgument(this, { optional: true }) ?? assertDefinedPass((new.target as Record)[entityTypeToken], 'Missing entity type.');
    this.table = table ?? getDrizzleTableFromType(this.type as EntityType, inject(EntityRepositoryConfig).schema);
    this.columnDefinitions = columnDefinitions ?? getColumnDefinitions(this.table);
    this.columnDefinitionsMap = columnDefinitionsMap ?? new Map(this.columnDefinitions.map((column) => [column.objectPath.path, column]));
    this.session = session ?? inject(Database);
    this.isInTransaction = this.session instanceof DrizzlePgTransaction;
    this.#transformContext = transformContext;
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

    const context: EntityRepositoryContext = {
      type: this.type,
      table: this.table,
      columnDefinitions: this.columnDefinitions,
      columnDefinitionsMap: this.columnDefinitionsMap,
      session: (transaction as DrizzleTransaction).transaction,
      encryptionSecret: this.#encryptionSecret,
      transformContext: this.#transformContext
    };

    const repositoryWithTransaction = runInEntityRepositoryContext(context, () => new this.#repositoryConstructor());

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

    const transformContext = await this.getTransformContext();
    return this.mapToEntity(row, transformContext);
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

    const transformContext = await this.getTransformContext();
    return this.mapManyToEntity(rows, transformContext);
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
    const transformContext = await this.getTransformContext();
    const columns = await this.mapToInsertColumns(entity, transformContext);

    const [row] = await this.session
      .insert(this.table)
      .values(columns)
      .returning();

    return this.mapToEntity(row!, transformContext);
  }

  async insertMany(entities: NewEntity<T>[]): Promise<T[]> {
    const transformContext = await this.getTransformContext();
    const columns = await this.mapManyToInsertColumns(entities, transformContext);
    const rows = await this.session.insert(this.table).values(columns).returning();

    return this.mapManyToEntity(rows, transformContext);
  }

  async upsert(target: OneOrMany<Paths<UntaggedDeep<T>>>, entity: NewEntity<T>, update?: EntityUpdate<T>): Promise<T> {
    const transformContext = await this.getTransformContext();

    const targetColumns = toArray(target).map((path) => {
      const columnName = assertDefinedPass(this.columnDefinitionsMap.get(path), `Could not map ${path} to column.`).name;
      return this.table[columnName as keyof PgTableFromType<string, EntityType>] as PgColumn;
    });

    const columns = await this.mapToInsertColumns(entity, transformContext);
    const mappedUpdate = await this.mapUpdate(update ?? (entity as EntityUpdate<T>), transformContext);

    const [row] = await this.session
      .insert(this.table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return this.mapToEntity(row!, transformContext);
  }

  async upsertMany(target: OneOrMany<Paths<UntaggedDeep<T>>>, entities: NewEntity<T>[], update: EntityUpdate<T>): Promise<T[]> {
    const transformContext = await this.getTransformContext();

    const targetColumns = toArray(target).map((path) => {
      const columnName = assertDefinedPass(this.columnDefinitionsMap.get(path), `Could not map ${path} to column.`).name;
      return this.table[columnName as keyof PgTableFromType<string, EntityType>] as PgColumn;
    });

    const columns = await this.mapManyToColumns(entities, transformContext);
    const mappedUpdate = await this.mapUpdate(update, transformContext);

    const rows = await this.session
      .insert(this.table)
      .values(columns)
      .onConflictDoUpdate({
        target: targetColumns,
        set: mappedUpdate
      })
      .returning();

    return this.mapManyToEntity(rows, transformContext);
  }

  async update(id: string, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdate(id, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} ${id} not found.`);
    }

    return entity;
  }

  async tryUpdate(id: string, update: EntityUpdate<T>): Promise<T | undefined> {
    const transformContext = await this.getTransformContext();
    const mappedUpdate = await this.mapUpdate(update, transformContext);

    const [row] = await this.session
      .update(this.table)
      .set(mappedUpdate)
      .where(eq(this.table.id, id))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row, transformContext);
  }

  async updateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T> {
    const entity = await this.tryUpdateByQuery(query, update);

    if (isUndefined(entity)) {
      throw new NotFoundError(`${this.type.entityName} not found.`);
    }

    return entity;
  }

  async tryUpdateByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T | undefined> {
    const transformContext = await this.getTransformContext();
    const mappedUpdate = await this.mapUpdate(update, transformContext);
    const idQuery = this.getIdLimitQuery(query);

    const [row] = await this.session
      .update(this.table)
      .set(mappedUpdate)
      .where(inArray(this.table.id, idQuery))
      .returning();

    if (isUndefined(row)) {
      return undefined;
    }

    return this.mapToEntity(row, transformContext);
  }

  async updateMany(ids: string[], update: EntityUpdate<T>): Promise<T[]> {
    return this.updateManyByQuery(inArray(this.table.id, ids), update);
  }

  async updateManyByQuery(query: Query<T>, update: EntityUpdate<T>): Promise<T[]> {
    const transformContext = await this.getTransformContext();
    const sqlQuery = this.convertQuery(query);
    const mappedUpdate = await this.mapUpdate(update, transformContext);

    const rows = await this.session
      .update(this.table)
      .set(mappedUpdate)
      .where(sqlQuery)
      .returning();

    return this.mapManyToEntity(rows, transformContext);
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

    const transformContext = await this.getTransformContext();
    return this.mapToEntity(row, transformContext);
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

    const transformContext = await this.getTransformContext();
    return this.mapToEntity(row, transformContext);
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

    const transformContext = await this.getTransformContext();
    return this.mapManyToEntity(rows, transformContext);
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

  protected async mapManyToEntity(columns: this['table']['$inferSelect'][], transformContext: TransformContext): Promise<T[]> {
    return toArrayAsync(mapAsync(columns, async (column) => this.mapToEntity(column, transformContext)));
  }

  protected async mapToEntity(columns: this['table']['$inferSelect'], transformContext: TransformContext): Promise<T> {
    const entries: [JsonPath, this['table']['$inferSelect'][keyof this['table']['$inferSelect']]][] = [];

    for (const def of this.columnDefinitions) {
      const rawValue = columns[def.name as keyof this['table']['$inferSelect']];
      const transformed = await def.fromDatabase(rawValue, transformContext);

      entries.push([def.objectPath, transformed] as const); // eslint-disable-line @typescript-eslint/no-unsafe-argument
    }

    const obj = fromDeepObjectEntries(entries);
    return Schema.parse(this.type, obj);
  }

  protected async mapManyToColumns(objects: (DeepPartial<T> | NewEntity<T>)[], transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType<string, EntityType>>[]> {
    return toArrayAsync(mapAsync(objects, async (obj) => this.mapToColumns(obj, transformContext)));
  }

  protected async mapToColumns(obj: DeepPartial<T> | NewEntity<T>, transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType<string, EntityType>>> {
    const columns: Record = {};

    for (const def of this.columnDefinitions) {
      const rawValue = def.dereferenceObjectPath(obj as Record);
      columns[def.name] = await def.toDatabase(rawValue, transformContext);
    }

    return columns as PgInsertValue<PgTableFromType<string, EntityType>>;
  }

  protected async mapManyToInsertColumns(objects: (DeepPartial<T> | NewEntity<T>)[], transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType<string, EntityType>>[]> {
    return toArrayAsync(mapAsync(objects, async (obj) => this.mapToInsertColumns(obj, transformContext)));
  }

  protected async mapToInsertColumns(obj: DeepPartial<T> | NewEntity<T>, transformContext: TransformContext): Promise<PgInsertValue<PgTableFromType<string, EntityType>>> {
    const mapped = await this.mapToColumns(obj, transformContext);

    return {
      ...mapped,
      revision: 1,
      revisionTimestamp: TRANSACTION_TIMESTAMP,
      createTimestamp: TRANSACTION_TIMESTAMP
    };
  }

  protected async mapUpdate(update: EntityUpdate<T>, transformContext: TransformContext): Promise<PgUpdateSetSource<PgTableFromType<string, EntityType>>> {
    const mappedUpdate: PgUpdateSetSource<PgTableFromType<string, EntityType>> = {};

    for (const column of this.columnDefinitions) {
      const value = column.dereferenceObjectPath(update as EntityUpdate<Entity>);

      if (isUndefined(value)) {
        continue;
      }

      mappedUpdate[column.name as keyof PgUpdateSetSource<PgTableFromType<string, EntityType>>] = await column.toDatabase(value, transformContext);
    }

    return {
      ...mappedUpdate,
      attributes: this.getAttributesUpdate((update as EntityUpdate<Entity>).metadata?.attributes),
      revision: sql<number>`${this.table.revision} + 1`,
      revisionTimestamp: TRANSACTION_TIMESTAMP
    } satisfies PgUpdateSetSource<PgTableFromType<string, EntityType>>;
  }

  protected getIdLimitQuery(query: Query<T>) {
    const sqlQuery = this.convertQuery(query);

    return this.session.select({ id: this.table.id })
      .from(this.table)
      .where(sqlQuery)
      .limit(1);
  }

  protected getAttributesUpdate(attributes: EntityMetadataAttributes | undefined) {
    if (isUndefined(attributes)) {
      return undefined;
    }

    return sql`${this.table.attributes} || '${JSON.stringify(attributes)}'::jsonb`;
  }

  protected async getTransformContext(): Promise<TransformContext> {
    if (isUndefined(this.#transformContext)) {
      assertDefined(this.#encryptionSecret, 'Missing database encryption secret');
      this.#transformContext = importSymmetricKey('AES-GCM', 256, this.#encryptionSecret, false).then((encryptionKey) => ({ encryptionKey }));

      const transformContext = await this.#transformContext;
      this.#transformContext = transformContext;
    }

    return this.#transformContext;
  }
}

export function injectRepository<T extends Entity>(type: EntityType<T>): EntityRepository<T> {
  return inject(EntityRepository<T>, type);
}

export function getRepository<T extends Entity>(type: EntityType<T>): Type<EntityRepository<T>> {
  const className = `${type.name}Service`;

  const entityRepositoryClass = {
    [className]: class extends EntityRepository<T> {
      static [entityTypeToken] = type;
    }
  }[className]!;

  Singleton()(entityRepositoryClass);

  return entityRepositoryClass;
}
