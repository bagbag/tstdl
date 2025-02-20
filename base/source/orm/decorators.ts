import type { LiteralUnion } from 'type-fest';

import { createClassDecorator, createDecorator, createPropertyDecorator } from '#/reflection/utils.js';
import { Property } from '#/schema/index.js';
import type { AbstractConstructor, TypedOmit } from '#/types.js';
import { assertNotArrayPass, isArray } from '#/utils/type-guards.js';
import type { EntityType } from './entity.js';

type IndexMethod = LiteralUnion<'hash' | 'btree' | 'gist' | 'spgist' | 'gin' | 'brin' | 'hnsw' | 'ivfflat', string>

export type OrmTableReflectionData = {
  name?: string,
  unique?: UniqueReflectionData[],
  index?: IndexReflectionData[]
};

export type OrmColumnReflectionData = {
  name?: string,
  primaryKey?: boolean,
  unique?: UniqueReflectionData,
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
    nulls?: 'distinct' | 'not distinct'
  }
};

export type IndexReflectionData = {
  name?: string,
  columns?: (string | [string, 'asc' | 'desc'])[],
  order?: 'asc' | 'desc',
  options?: {
    using?: IndexMethod,
    unique?: boolean,
    nulls?: 'first' | 'last'
  }
};

export function createTableDecorator(data?: OrmTableReflectionData) {
  return createClassDecorator({ data: { orm: data }, mergeData: true });
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

export function Encrypted() {
  return createColumnDecorator({ encrypted: true });
}

export function Embedded(type: AbstractConstructor, options?: TypedOmit<NonNullable<OrmColumnReflectionData['embedded']>, 'type'>) {
  return createPropertyDecorator({
    include: [Property(type), createColumnDecorator({ embedded: { type, ...options } })]
  });
}

export function Unique(name?: string, options?: UniqueReflectionData['options']): PropertyDecorator;
export function Unique(name: string | undefined, columns: [string, ...string[]], options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique(columns: [string, ...string[]], options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique(nameOrColumns?: string | [string, ...string[]], columnsOrOptions?: [string, ...string[]] | UniqueReflectionData['options'], options?: UniqueReflectionData['options']) {
  if (isArray(nameOrColumns)) {
    return createTableDecorator({ unique: [{ columns: nameOrColumns, options: assertNotArrayPass(columnsOrOptions) }] });
  }

  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ unique: [{ name: nameOrColumns, columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ unique: { name: nameOrColumns, options: columnsOrOptions ?? options } });
}

export function Index(name?: string, options?: IndexReflectionData['options']): PropertyDecorator;
export function Index(name: string | undefined, columns: [string, ...string[]], options?: IndexReflectionData['options']): ClassDecorator;
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
