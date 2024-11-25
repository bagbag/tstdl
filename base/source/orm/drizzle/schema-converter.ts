import type { BuildColumns, NotNull } from 'drizzle-orm';
import { toSnakeCase } from 'drizzle-orm/casing';
import { boolean, doublePrecision, integer, pgSchema, text, unique, uuid, type PgColumn, type PgColumnBuilder, type PgEnum, type PgSchema, type PgTableWithColumns } from 'drizzle-orm/pg-core';
import type { SnakeCase } from 'type-fest';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import { reflectionRegistry } from '#/reflection/registry.js';
import { ArraySchema, BooleanSchema, EnumerationSchema, getObjectSchema, NullableSchema, NumberSchema, OptionalSchema, StringSchema, type Record, type Schema } from '#/schema/index.js';
import type { Enumeration, Type } from '#/types.js';
import { enumValues } from '#/utils/enum.js';
import { memoize, memoizeSingle } from '#/utils/function/memoize.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, assertStringPass, isArray, isDefined, isString, isUndefined } from '#/utils/type-guards.js';
import type { OrmColumnReflectionData, OrmTableReflectionData } from '../decorators.js';
import type { EntityType } from '../entity.js';
import { UuidSchema } from '../schemas/uuid.js';
import type { ColumnBuilder } from '../types.js';

type Column<Name extends string, T> = null extends T ? ColumnBuilder<T, Name> : NotNull<ColumnBuilder<T, Name>>;

const getDbSchema = memoizeSingle(pgSchema);
export const getDrizzleTableFromType = memoize(_getDrizzleTableFromType);

export type PgTableFromType<S extends string, T extends Type, TableName extends string = T extends EntityType ? SnakeCase<T['entityName']> : string> = PgTableWithColumns<{
  name: TableName,
  schema: S,
  columns: BuildColumns<TableName, { [P in keyof InstanceType<T>]: Column<Extract<P, string>, InstanceType<T>[P]>; }, 'pg'>,
  dialect: 'pg'
}>;

export function _getDrizzleTableFromType<S extends string, T extends Type>(schemaName: S, type: T, tableName: string = getDefaultTableName(type)): PgTableFromType<S, T> {
  const metadata = reflectionRegistry.getMetadata(type);

  if (isUndefined(metadata)) {
    throw new Error('Type does not have reflection metadata.');
  }

  const dbSchema = getDbSchema(schemaName);
  const tableReflectionData = metadata.data.tryGet<OrmTableReflectionData>('orm');
  const objectSchema = getObjectSchema<Record<string>>(type);

  const entries = objectEntries(objectSchema.properties).map(([property, schema]) => {
    const columnReflectionData = metadata.properties.get(property)?.data.tryGet<OrmColumnReflectionData>('orm');
    const propertyName = columnReflectionData?.name ?? assertStringPass(toSnakeCase(property));

    return [
      property,
      getPostgresColumn(tableName, propertyName, dbSchema, schema, columnReflectionData ?? {})
    ] as const;
  });

  function getColumn(table: Record<string, PgColumn>, propertyName: string): PgColumn {
    return assertDefinedPass(table[propertyName], `Property "${propertyName}" does not exist on ${type.name}`);
  }

  const drizzleSchema = dbSchema.table(tableName, fromEntries(entries) as any, (table: Record<string, PgColumn>) => {
    const uniqueEntries = tableReflectionData?.unique?.map((data, index) => {
      const columns = data.columns?.map((column) => getColumn(table, column)) as [PgColumn, ...PgColumn[]];
      let constraint = unique(isDefined(data.name) ? toSnakeCase(data.name) : undefined).on(...columns);

      if (data.options?.nulls == 'not distinct') {
        constraint = constraint.nullsNotDistinct();
      }

      return [`unique_${index}`, constraint] as const;
    });

    return {
      ...isDefined(uniqueEntries) ? fromEntries(uniqueEntries) : undefined
    };
  });

  return drizzleSchema as any; // eslint-disable-line @typescript-eslint/no-unsafe-return
}

function getPostgresColumn(tableName: string, columnName: string, dbSchema: PgSchema, propertySchema: Schema, reflectionData: OrmColumnReflectionData): PgColumnBuilder<any, any, any, any> {
  let nullable = false;
  let array = false;

  let baseSchema = propertySchema;
  while (true) {
    if ((baseSchema instanceof NullableSchema) || (baseSchema instanceof OptionalSchema)) {
      nullable = true;
      baseSchema = baseSchema.schema;
    }
    else if (baseSchema instanceof ArraySchema) {
      array = true;
      baseSchema = baseSchema.itemSchema;
    }
    else {
      break;
    }
  }

  let column = getPostgresBaseColumn(tableName, columnName, dbSchema, baseSchema);

  if (array) {
    column = column.array();
  }

  if (!nullable) {
    column = column.notNull();
  }

  if (isDefined(reflectionData.unique)) {
    column = column.unique(reflectionData.unique.name, isString(reflectionData.unique.options?.nulls) ? { nulls: reflectionData.unique.options.nulls } : undefined);
  }

  if (reflectionData.primaryKey == true) {
    column = column.primaryKey();
  }

  return column;
}

function getPostgresBaseColumn(tableName: string, columnName: string, dbSchema: PgSchema, schema: Schema): PgColumnBuilder<any, any, any, any> {
  if (schema instanceof NumberSchema) {
    return schema.integer
      ? integer(columnName)
      : doublePrecision(columnName);
  }

  if (schema instanceof UuidSchema) {
    let column = uuid(columnName);

    if (schema.defaultRandom) {
      column = column.defaultRandom();
    }

    return column;
  }

  if (schema instanceof StringSchema) {
    return text(columnName);
  }

  if (schema instanceof BooleanSchema) {
    return boolean(columnName);
  }

  if (schema instanceof EnumerationSchema) {
    const pgEnum = getPgEnum(tableName, columnName, dbSchema, schema.enumeration);
    return pgEnum(columnName);
  }

  throw new NotSupportedError(`Schema ${schema.constructor.name} not supported`);
}

const enums = new Map<Enumeration, string>();

export function registerEnum(enumeration: Enumeration, name: string): void {
  enums.set(enumeration, name);
}

function getPgEnum(tableName: string, columnName: string, dbSchema: PgSchema, enumeration: Enumeration): PgEnum<[string, ...string[]]> {
  const values = (isArray(enumeration) ? enumeration : enumValues(enumeration))
    .map((value) => value.toString());

  const enumName = enums.get(enumeration) ?? `${tableName}_${columnName}_enum`;
  return dbSchema.enum(enumName, values as [string, ...string[]]);
}

function getDefaultTableName(type: Type & Partial<Pick<EntityType, 'entityName'>>): string {
  return toSnakeCase(isString(type.entityName) ? type.entityName : type.name);
}
