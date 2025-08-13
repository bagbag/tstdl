/**
 * @module
 * Defines decorators for ORM entities and columns, used to configure database schema mapping.
 */
import type { SQL } from 'drizzle-orm';
import type { LiteralUnion } from 'type-fest';

import { createClassDecorator, createDecorator, createPropertyDecorator } from '#/reflection/index.js';
import { Property } from '#/schema/index.js';
import type { AbstractConstructor, TypedOmit } from '#/types/index.js';
import { filterUndefinedObjectProperties, objectEntries } from '#/utils/object/object.js';
import { isArray, isString, isUndefined } from '#/utils/type-guards.js';
import type { AnyEntity, Entity, EntityType, EntityWithoutMetadata } from './entity.js';
import type { Query } from './query.js';
import type { TargetColumnPaths } from './repository.types.js';
import type { PgTableFromType } from './server/types.js';

type IndexMethod = LiteralUnion<'hash' | 'btree' | 'gist' | 'spgist' | 'gin' | 'brin' | 'hnsw' | 'ivfflat', string>;
type NamingStrategy = 'abbreviated-table';

type Columns<T> = [Extract<keyof T, string>, ...Extract<keyof T, string>[]];

/**
 * Builder function type for creating SQL check constraints.
 * @param table - The Drizzle table object.
 * @returns The SQL check constraint expression.
 */
export type CheckBuilder<T extends Entity = any> = (table: PgTableFromType<EntityType<T>>) => SQL;

/**
 * Builder function type for creating partial index WHERE clauses.
 * @param table - The Drizzle table object.
 * @returns The query object representing the WHERE clause.
 */
export type WhereBuilder<T extends Entity | EntityWithoutMetadata = any> = (table: PgTableFromType<EntityType<T>>) => Query<T>;

/**
 * Reflection data stored for ORM table decorators.
 */
export type OrmTableReflectionData = {
  name?: string,
  schema?: string,
  compundPrimaryKeyName?: string,
  compundPrimaryKeyNaming?: NamingStrategy,
  unique?: UniqueReflectionData[],
  index?: IndexReflectionData[],
  checks?: CheckReflectionData[],
  foreignKeys?: ForeignKeyReflectionData[],
};

/**
 * Reflection data stored for ORM column decorators.
 */
export type OrmColumnReflectionData = {
  name?: string,
  primaryKey?: boolean,
  unique?: TypedOmit<UniqueReflectionData, 'columns'>,
  index?: IndexReflectionData,
  uuid?: { defaultRandom?: boolean },
  embedded?: { type: AbstractConstructor, prefix?: string | null },
  references?: { target: () => EntityType, targetColumn?: TargetColumnPaths<any> }[],
  encrypted?: boolean,
};

/**
 * Reflection data for unique constraints.
 */
export type UniqueReflectionData = {
  columns?: string[],
  options?: {
    name?: string,
    naming?: NamingStrategy,
    nulls?: 'distinct' | 'not distinct',
  },
};

/**
 * Reflection data for index definitions.
 * @template T - The entity type.
 */
export type IndexReflectionData<T extends Entity | EntityWithoutMetadata = any> = {
  columns?: (string | [string, 'asc' | 'desc'])[],
  order?: 'asc' | 'desc',
  options?: {
    name?: string,
    naming?: NamingStrategy,
    using?: IndexMethod,
    unique?: boolean,
    where?: WhereBuilder<T>,
    nulls?: 'first' | 'last',
  },
};

type CheckReflectionData = {
  name: string,
  builder: CheckBuilder,
  options?: {
    naming?: NamingStrategy,
  },
};

export type ForeignKeyReflectionData = {
  target: () => EntityType,
  columns: TargetColumnPaths<any>[],
  foreignColumns: TargetColumnPaths<any>[],
  options?: {
    name?: string,
    naming?: NamingStrategy,
  },
};

/**
 * Factory function to create a class decorator for ORM table configuration.
 * Merges provided data with existing ORM reflection data on the class metadata.
 * @param data - The ORM table reflection data to add.
 * @returns A class decorator.
 */
export function createTableDecorator(data: OrmTableReflectionData = {}) {
  return createClassDecorator({
    handler: (_, metadata) => {
      const reflectionData = metadata.data.tryGet<OrmTableReflectionData>('orm') ?? {};
      const dataEntries = objectEntries(data);

      if (dataEntries.length == 0) {
        return;
      }

      for (const [key, value] of dataEntries) {
        const existingValue = reflectionData[key];

        if (isArray(existingValue)) {
          reflectionData[key] = [...existingValue, ...(value as any[])] as any;
        }
        else {
          reflectionData[key] = value as any;
        }
      }

      metadata.data.set('orm', reflectionData, true);
    },
  });
}

/**
 * Factory function to create a property decorator for ORM column configuration.
 * Merges provided data with existing ORM reflection data on the property metadata.
 * @param data - The ORM column reflection data to add.
 * @returns A property decorator.
 */
export function createColumnDecorator(data: OrmColumnReflectionData = {}) {
  return createPropertyDecorator({
    handler: (_, metadata) => {
      const reflectionData = metadata.data.tryGet<OrmColumnReflectionData>('orm') ?? {};
      const dataEntries = objectEntries(data);

      if (dataEntries.length == 0) {
        return;
      }

      for (const [key, value] of dataEntries) {
        const existingValue = reflectionData[key];

        if (isArray(existingValue)) {
          reflectionData[key] = [...existingValue, ...(value as any[])] as any;
        }
        else {
          reflectionData[key] = value as any;
        }
      }

      metadata.data.set('orm', reflectionData, true);
    },
  });
}

/**
 * Factory function to create a decorator applicable to both classes and properties for ORM configuration.
 * Merges provided data with existing ORM reflection data on the target's metadata.
 * @param data - The ORM reflection data to add.
 * @returns A class or property decorator.
 */
export function createTableAndColumnDecorator(data?: OrmColumnReflectionData) {
  return createDecorator({ class: true, property: true, data: { orm: data }, mergeData: true });
}

/**
 * Decorator to specify ORM column options.
 * @param options - Column configuration options.
 * @returns A property decorator.
 */
export function Column(options: OrmColumnReflectionData) {
  return createColumnDecorator({ ...options });
}

/**
 * Decorator to mark a property as the primary key column.
 * @returns A property decorator.
 */
export function PrimaryKey() {
  return createColumnDecorator({ primaryKey: true });
}

/**
 * Decorator to define a foreign key relationship.
 * @param type - A function returning the referenced entity type.
 * @returns A property decorator.
 */
export function References(target: () => EntityType): PropertyDecorator;
export function References<T extends AnyEntity>(target: () => EntityType<T>, targetColumn?: TargetColumnPaths<T>): PropertyDecorator;
export function References<T extends AnyEntity>(target: () => EntityType<T>, targetColumn?: TargetColumnPaths<T>): PropertyDecorator {
  return createColumnDecorator({ references: [{ target, targetColumn }] });
}

/**
 * Decorator to define a table check constraint.
 * @template T - The entity type.
 * @param name - The name of the check constraint.
 * @param builder - A function to build the SQL check expression.
 * @returns A class decorator.
 */
export function Check<T extends Entity>(name: string, builder: CheckBuilder<T>) {
  return createTableDecorator({ checks: [{ name, builder }] });
}

/**
 * Decorator to mark a column for encryption.
 * The underlying database type will typically be `bytea`.
 * @returns A property decorator.
 */
export function Encrypted() {
  return createColumnDecorator({ encrypted: true });
}

/**
 * Decorator to embed another class's properties into the current entity's table.
 * @param type - The constructor of the class to embed.
 * @param options - Embedding options, like prefixing column names.
 * @returns A property decorator.
 */
export function Embedded(type: AbstractConstructor, options?: TypedOmit<NonNullable<OrmColumnReflectionData['embedded']>, 'type'>) {
  return createPropertyDecorator({
    include: [Property(type), createColumnDecorator({ embedded: { type, ...options } })],
  });
}

export type TableOptions = Partial<Pick<OrmTableReflectionData, 'name' | 'schema'>>;

/**
 * Decorator to specify the database table name and optionally the schema.
 * @param name - The table name.
 * @param options - Additional table options (currently only schema).
 * @returns A class decorator.
 */
export function Table(name?: string, options?: TypedOmit<TableOptions, 'schema'>): ClassDecorator;

/**
 * Decorator to specify database table options like name and schema.
 * @param options - Table options including name and schema.
 * @returns A class decorator.
 */
export function Table(options?: TableOptions): ClassDecorator;
export function Table(nameOrOptions?: string | TableOptions, optionsOrNothing?: TableOptions): ClassDecorator {
  const name = isString(nameOrOptions) ? nameOrOptions : nameOrOptions?.name;
  const schema = isString(nameOrOptions) ? optionsOrNothing?.schema : nameOrOptions?.schema;

  const data: OrmTableReflectionData | undefined = (isUndefined(name) && isUndefined(schema))
    ? undefined
    : filterUndefinedObjectProperties({ name, schema });

  return createTableDecorator(data);
}

/**
 * Decorator to define a foreign key relationship.
 * @param target - A function returning the referenced entity type.
 * @param columns - The columns in the current entity that form the foreign key.
 * @param foreignColumns - The columns in the referenced entity that the foreign key points to.
 * @param options - Additional foreign key options (e.g., name, naming strategy).
 * @template TThis - The entity type of the current entity.
 * @template TTarget - The entity type of the referenced entity.
 * @returns A property decorator.
 */
export function ForeignKey<TThis extends AnyEntity, TTarget extends AnyEntity>(target: () => EntityType<TTarget>, columns: Columns<TThis>, foreignColumns: Columns<TTarget>, options?: ForeignKeyReflectionData['options']): ClassDecorator {
  return createTableDecorator({ foreignKeys: [{ target, columns, foreignColumns, options }] });
}

/**
 * Decorator to define a unique constraint on a single column.
 * @param name - Optional name for the unique constraint.
 * @param options - Additional unique constraint options.
 * @returns A property decorator.
 */
export function Unique(options?: UniqueReflectionData['options']): PropertyDecorator;

/**
 * Decorator to define a composite unique constraint on multiple columns.
 * @template T - The entity type.
 * @param columns - An array of property names included in the constraint.
 * @param options - Additional unique constraint options.
 * @returns A class decorator.
 */
export function Unique<T extends AnyEntity>(columns: Columns<T>, options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique<T extends AnyEntity>(columnsOrOptions?: Columns<T> | UniqueReflectionData['options'], options?: UniqueReflectionData['options']) {
  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ unique: [{ columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ unique: { options: columnsOrOptions } });
}

/**
 * Decorator to define an index on a single column.
 * @template T - The entity type.
 * @param name - Optional name for the index.
 * @param options - Additional index options (e.g., method, uniqueness, conditions).
 * @returns A property decorator.
 */
export function Index<T extends Entity | EntityWithoutMetadata = any>(options?: IndexReflectionData<T>['options']): PropertyDecorator;

/**
 * Decorator to define a composite index on multiple columns.
 * @template T - The entity type.
 * @param columns - An array of property names (or tuples with direction) included in the index.
 * @param options - Additional index options.
 * @returns A class decorator.
 */
export function Index<T extends Entity | EntityWithoutMetadata = any>(columns: Columns<T>, options?: IndexReflectionData<T>['options']): ClassDecorator;
export function Index<T extends Entity | EntityWithoutMetadata = any>(columnsOrOptions?: Columns<T> | IndexReflectionData<T>['options'], options?: IndexReflectionData<T>['options']) {
  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ index: [{ columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ index: { options: columnsOrOptions } });
}
