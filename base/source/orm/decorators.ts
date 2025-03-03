import type { SQL } from 'drizzle-orm';
import type { LiteralUnion } from 'type-fest';

import { createClassDecorator, createDecorator, createPropertyDecorator } from '#/reflection/index.js';
import { Property } from '#/schema/index.js';
import type { AbstractConstructor, TypedOmit } from '#/types.js';
import { filterUndefinedObjectProperties, objectEntries } from '#/utils/object/object.js';
import { assertNotArrayPass, isArray, isString, isUndefined } from '#/utils/type-guards.js';
import type { Entity, EntityType } from './entity.js';
import type { PgTableFromType } from './server/types.js';

type IndexMethod = LiteralUnion<'hash' | 'btree' | 'gist' | 'spgist' | 'gin' | 'brin' | 'hnsw' | 'ivfflat', string>;
type NamingStrategy = 'abbreviated-table';

export type CheckBuilder<T extends Entity = any> = (table: PgTableFromType<EntityType<T>>) => SQL;

export type OrmTableReflectionData = {
  name?: string,
  schema?: string,
  compundPrimaryKeyName?: string,
  compundPrimaryKeyNaming?: NamingStrategy,
  unique?: UniqueReflectionData[],
  index?: IndexReflectionData[],
  checks?: CheckReflectionData[]
};

export type OrmColumnReflectionData = {
  name?: string,
  primaryKey?: boolean,
  unique?: TypedOmit<UniqueReflectionData, 'columns'>,
  index?: IndexReflectionData,
  uuid?: { defaultRandom?: boolean },
  embedded?: { type: AbstractConstructor, prefix?: string | null },
  references?: () => EntityType,
  encrypted?: boolean
};

export type UniqueReflectionData = {
  name?: string,
  columns?: string[],
  options?: {
    nulls?: 'distinct' | 'not distinct',
    naming?: NamingStrategy
  }
};

export type IndexReflectionData = {
  name?: string,
  columns?: (string | [string, 'asc' | 'desc'])[],
  order?: 'asc' | 'desc',
  options?: {
    using?: IndexMethod,
    unique?: boolean,
    nulls?: 'first' | 'last',
    naming?: NamingStrategy
  }
};

type CheckReflectionData = {
  name: string,
  builder: CheckBuilder,
  options?: {
    naming?: NamingStrategy
  }
};

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
    }
  });
}

export function createColumnDecorator(data?: OrmColumnReflectionData) {
  return createPropertyDecorator({ data: { orm: data }, mergeData: true });
}

export function createTableAndColumnDecorator(data?: OrmColumnReflectionData) {
  return createDecorator({ class: true, property: true, data: { orm: data }, mergeData: true });
}

export function Column(options: OrmColumnReflectionData) {
  return createColumnDecorator({ ...options });
}

export function PrimaryKey() {
  return createColumnDecorator({ primaryKey: true });
}

export function References(type: () => EntityType) {
  return createColumnDecorator({ references: type });
}

export function Check<T extends Entity>(name: string, builder: CheckBuilder<T>) {
  return createTableDecorator({ checks: [{ name, builder }] });
}

export function Encrypted() {
  return createColumnDecorator({ encrypted: true });
}

export function Embedded(type: AbstractConstructor, options?: TypedOmit<NonNullable<OrmColumnReflectionData['embedded']>, 'type'>) {
  return createPropertyDecorator({
    include: [Property(type), createColumnDecorator({ embedded: { type, ...options } })]
  });
}

type TableOptions = Partial<Pick<OrmTableReflectionData, 'name' | 'schema'>>;
export function Table(name?: string, options?: TypedOmit<TableOptions, 'schema'>): ClassDecorator;
export function Table(options?: TableOptions): ClassDecorator;
export function Table(nameOrOptions?: string | TableOptions, optionsOrNothing?: TableOptions): ClassDecorator {
  const name = isString(nameOrOptions) ? nameOrOptions : nameOrOptions?.name;
  const schema = isString(nameOrOptions) ? optionsOrNothing?.schema : nameOrOptions?.schema;

  const data: OrmTableReflectionData | undefined = (isUndefined(name) && isUndefined(schema))
    ? undefined
    : filterUndefinedObjectProperties({ name, schema });

  return createTableDecorator(data);
}

export function Unique(name?: string, options?: UniqueReflectionData['options']): PropertyDecorator;
export function Unique<T>(name: string | undefined, columns: [Extract<keyof T, string>, ...Extract<keyof T, string>[]], options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique<T>(columns: [Extract<keyof T, string>, ...Extract<keyof T, string>[]], options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique<T>(nameOrColumns?: string | [Extract<keyof T, string>, ...Extract<keyof T, string>[]], columnsOrOptions?: [Extract<keyof T, string>, ...Extract<keyof T, string>[]] | UniqueReflectionData['options'], options?: UniqueReflectionData['options']) {
  if (isArray(nameOrColumns)) {
    return createTableDecorator({ unique: [{ columns: nameOrColumns, options: assertNotArrayPass(columnsOrOptions) }] });
  }

  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ unique: [{ name: nameOrColumns, columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ unique: { name: nameOrColumns, options: columnsOrOptions } });
}

export function Index(name?: string, options?: IndexReflectionData['options']): PropertyDecorator;
export function Index(name: string, columns: [string, ...string[]], options?: IndexReflectionData['options']): ClassDecorator;
export function Index(columns: [string, ...string[]], options?: IndexReflectionData['options']): ClassDecorator;
export function Index(nameOrColumns?: string | [string, ...string[]], columnsOrOptions?: [string, ...string[]] | IndexReflectionData['options'], options?: IndexReflectionData['options']) {
  if (isArray(nameOrColumns)) {
    return createTableDecorator({ index: [{ columns: nameOrColumns, options: assertNotArrayPass(columnsOrOptions) }] });
  }

  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ index: [{ name: nameOrColumns, columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ index: { name: nameOrColumns, options: columnsOrOptions ?? options } });
}
