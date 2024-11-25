import { createClassDecorator, createDecorator, createPropertyDecorator } from '#/reflection/utils.js';
import { isArray } from '#/utils/type-guards.js';

export type OrmTableReflectionData = {
  name?: string,
  unique?: UniqueReflectionData[]
};

export type OrmColumnReflectionData = {
  name?: string,
  primaryKey?: boolean,
  unique?: UniqueReflectionData,
  uuid?: {
    defaultRandom?: boolean
  }
};

type UniqueReflectionData = {
  name?: string,
  columns?: string[],
  options?: {
    nulls?: 'distinct' | 'not distinct'
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

export function Unique(name?: string, options?: UniqueReflectionData['options']): PropertyDecorator;
export function Unique(name: string | undefined, columns: [string, ...string[]], options?: UniqueReflectionData['options']): ClassDecorator;
export function Unique(name?: string, columnsOrOptions?: [string, ...string[]] | UniqueReflectionData['options'], options?: UniqueReflectionData['options']) {
  if (isArray(columnsOrOptions)) {
    return createTableDecorator({ unique: [{ name, columns: columnsOrOptions, options }] });
  }

  return createColumnDecorator({ unique: { name, options: columnsOrOptions ?? options } });
}
