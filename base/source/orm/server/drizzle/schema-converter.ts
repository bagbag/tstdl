import { toCamelCase, toSnakeCase } from 'drizzle-orm/casing';
import { boolean, check, doublePrecision, index, integer, jsonb, pgSchema, primaryKey, text, unique, uniqueIndex, uuid, type AnyPgColumn, type ExtraConfigColumn, type PgColumnBuilder, type PgEnum, type PgSchema, type PgTableWithColumns } from 'drizzle-orm/pg-core';

import { MultiKeyMap } from '#/data-structures/multi-key-map.js';
import { tryGetEnumName } from '#/enumeration/enumeration.js';
import { NotSupportedError } from '#/errors/not-supported.error.js';
import { JsonPath } from '#/json-path/json-path.js';
import { reflectionRegistry } from '#/reflection/registry.js';
import { ArraySchema, BooleanSchema, DefaultSchema, EnumerationSchema, getObjectSchema, NullableSchema, NumberSchema, ObjectSchema, OptionalSchema, StringSchema, Uint8ArraySchema, type Record, type Schema } from '#/schema/index.js';
import type { AbstractConstructor, Enumeration, EnumerationObject, Type } from '#/types.js';
import { compareByValueSelectionToOrder, orderRest } from '#/utils/comparison.js';
import { decodeText, encodeUtf8 } from '#/utils/encoding.js';
import { enumValues } from '#/utils/enum.js';
import { memoize, memoizeSingle } from '#/utils/function/memoize.js';
import { compileDereferencer } from '#/utils/object/dereference.js';
import { fromEntries, objectEntries } from '#/utils/object/object.js';
import { assertDefined, assertDefinedPass, isArray, isDefined, isNull, isString, isUndefined } from '#/utils/type-guards.js';
import type { IndexReflectionData, OrmColumnReflectionData, OrmTableReflectionData } from '../../decorators.js';
import type { EntityType } from '../../entity.js';
import { JsonSchema } from '../../schemas/json.js';
import { NumericDateSchema } from '../../schemas/numeric-date.js';
import { TimestampSchema } from '../../schemas/timestamp.js';
import { UuidSchema } from '../../schemas/uuid.js';
import { bytea, numericDate, timestamp } from '../data-types/index.js';
import { decryptBytes, encryptBytes } from '../encryption.js';
import type { BuildTypeOptions, ColumnDefinition, PgTableFromType, TransformContext } from '../types.js';

type ConverterContext = { type: AbstractConstructor, property: string };

const getDbSchema = memoizeSingle(pgSchema);

export const getDrizzleTableFromType = memoize(_getDrizzleTableFromType);

const columnDefinitionsSymbol = Symbol('columnDefinitions');

export function getColumnDefinitions(table: PgTableWithColumns<any>): ColumnDefinition[] {
  return (table as PgTableWithColumns<any> & { [columnDefinitionsSymbol]: ColumnDefinition[] })[columnDefinitionsSymbol];
}

export function _getDrizzleTableFromType<T extends EntityType, S extends string>(type: T, schemaName?: S): PgTableFromType<S, T> {
  const metadata = reflectionRegistry.getMetadata(type);
  assertDefined(metadata, `Type ${type.name} does not have reflection metadata.`);

  const tableReflectionData = metadata.data.tryGet<OrmTableReflectionData>('orm');
  const schema = assertDefinedPass(schemaName ?? tableReflectionData?.schema, 'Table schema not provided');
  const tableName = tableReflectionData?.name ?? getDefaultTableName(type);

  const dbSchema = getDbSchema(schema);
  const columnDefinitions = getPostgresColumnEntries(type, tableName, dbSchema);

  function getColumn(table: Record<string, ExtraConfigColumn>, propertyName: string): ExtraConfigColumn {
    return assertDefinedPass(table[propertyName], `Property "${propertyName}" does not exist on ${type.name}`);
  }

  function buildIndex(table: Record<string, ExtraConfigColumn>, data: IndexReflectionData, columnName?: string) {
    const columns = (data.columns ?? [columnName]).map((columnValue) => {
      assertDefined(columnValue, 'Missing column name for index.');

      const [columnName, columnOrder] = isString(columnValue) ? [columnValue] as const : columnValue;
      const order = columnOrder ?? data.order ?? 'asc';

      let column = getColumn(table, columnName);
      column = column[order]() as ExtraConfigColumn;

      if (data.options?.nulls == 'first') {
        column = column.nullsFirst() as ExtraConfigColumn;
      }
      else if (data.options?.nulls == 'last') {
        column = column.nullsLast() as ExtraConfigColumn;
      }

      return column;
    }) as [ExtraConfigColumn, ...ExtraConfigColumn[]];

    const indexFn = (data.options?.unique == true) ? uniqueIndex : index;

    return indexFn(data.name).using(data.options?.using ?? 'btree', ...columns);
  }

  const primaryKeyColumns = columnDefinitions.filter((columnDefinition) => columnDefinition.reflectionData?.primaryKey == true);

  const skipPrimaryKey = primaryKeyColumns.length > 1;
  const columnEntries = columnDefinitions.map((entry) => [entry.name, entry.buildType({ skipPrimaryKey })]);

  const drizzleSchema = dbSchema.table(
    tableName,
    fromEntries(columnEntries) as any,
    (table) => [
      ...(
        (primaryKeyColumns.length > 1)
          ? [primaryKey({ columns: primaryKeyColumns.map((columnDefinition) => getColumn(table, columnDefinition.name)) as unknown as [AnyPgColumn, ...AnyPgColumn[]] })]
          : []
      ),
      ...(
        columnDefinitions.map((columnDefinition) => {
          const indexData = columnDefinition.reflectionData?.index;

          if (isUndefined(indexData)) {
            return undefined;
          }

          return buildIndex(table, indexData, columnDefinition.name);
        }).filter(isDefined)
      ),
      ...(
        tableReflectionData?.unique?.map((data) => {
          const columns = data.columns?.map((column) => getColumn(table, column)) as [ExtraConfigColumn, ...ExtraConfigColumn[]];
          let constraint = unique(isDefined(data.name) ? toSnakeCase(data.name) : undefined).on(...columns);

          if (data.options?.nulls == 'not distinct') {
            constraint = constraint.nullsNotDistinct();
          }

          return constraint;
        }) ?? []
      ),
      ...(tableReflectionData?.index?.map((data) => buildIndex(table, data)) ?? []),
      ...(tableReflectionData?.checks?.map((data) => check(data.name, data.builder(table as PgTableWithColumns<any> as PgTableFromType<string, EntityType<any>>))) ?? [])
    ]
  );

  (drizzleSchema as Record)[columnDefinitionsSymbol] = columnDefinitions;

  return drizzleSchema as any as PgTableFromType<S, T>;
}

function getPostgresColumnEntries(type: AbstractConstructor, tableName: string, dbSchema: PgSchema, path = new JsonPath({ dollar: false }), prefix: string = ''): ColumnDefinition[] {
  const metadata = reflectionRegistry.getMetadata(type);
  assertDefined(metadata, `Type ${type.name} does not have reflection metadata (path: ${path.toString()}).`);

  const objectSchema = getObjectSchema<Record<string>>(type);

  const entries = objectEntries(objectSchema.properties).toSorted(compareByValueSelectionToOrder(['id', orderRest, 'metadata'], (item) => item[0])).flatMap(([property, schema]): ColumnDefinition[] => {
    const columnReflectionData = metadata.properties.get(property)?.data.tryGet<OrmColumnReflectionData>('orm');
    const columnName = columnReflectionData?.name ?? toSnakeCase(property);

    if ((schema instanceof ObjectSchema) && !(schema instanceof JsonSchema)) {
      const propertyMetadata = reflectionRegistry.getMetadata(type)?.properties.get(property);
      assertDefined(propertyMetadata, `Property "${property}" of type "${type.name}" does not have reflection metadata (path: ${path.toString()}).`);

      const propertyPrefix = columnReflectionData?.embedded?.prefix;
      const nestedPrefix = [prefix, isNull(propertyPrefix) ? '' : propertyPrefix ?? `${columnName}_`].join('');

      return getPostgresColumnEntries(columnReflectionData?.embedded?.type ?? propertyMetadata.type, tableName, dbSchema, path.add(property), nestedPrefix);
    }

    const objectPath = path.add(property);

    const encrypted = columnReflectionData?.encrypted == true;

    const toDatabase = encrypted
      ? async (value: unknown, context: TransformContext) => {
        const bytes = encodeUtf8(value as string);
        return encryptBytes(bytes, context.encryptionKey!);
      }
      : (value: unknown) => value;

    const fromDatabase = encrypted
      ? async (value: unknown, context: TransformContext) => {
        const decrypted = await decryptBytes(value as Uint8Array, context.encryptionKey!);
        return decodeText(decrypted);
      }
      : (value: unknown) => value;

    const prefixedColumnName = [prefix, columnName].join('');

    return [{
      name: toCamelCase(prefixedColumnName),
      objectPath,
      reflectionData: columnReflectionData,
      buildType: (options: BuildTypeOptions) => getPostgresColumn(toSnakeCase(prefixedColumnName), dbSchema, schema, columnReflectionData ?? {}, options, { type, property }),
      dereferenceObjectPath: compileDereferencer(objectPath, { optional: true }),
      toDatabase,
      fromDatabase
    }];
  });

  return entries;
}

function getPostgresColumn(columnName: string, dbSchema: PgSchema, propertySchema: Schema, reflectionData: OrmColumnReflectionData, options: BuildTypeOptions, context: ConverterContext): PgColumnBuilder<any, any, any, any> {
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

  let column = getPostgresBaseColumn(columnName, dbSchema, baseSchema, reflectionData, context);

  if (array) {
    column = column.array();
  }

  if (!nullable) {
    column = column.notNull();
  }

  if (isDefined(reflectionData.unique)) {
    column = column.unique(reflectionData.unique.name, isString(reflectionData.unique.options?.nulls) ? { nulls: reflectionData.unique.options.nulls } : undefined);
  }

  if ((reflectionData.primaryKey == true) && (options.skipPrimaryKey != true)) {
    column = column.primaryKey();
  }

  if (isDefined(reflectionData.references)) {
    column = column.references(() => getDrizzleTableFromType(reflectionData.references!(), dbSchema.schemaName).id);
  }

  return column;
}

function getPostgresBaseColumn(columnName: string, dbSchema: PgSchema, schema: Schema, reflectionData: OrmColumnReflectionData, context: ConverterContext): PgColumnBuilder<any, any, any, any> {
  if (schema instanceof DefaultSchema) {
    const column = getPostgresBaseColumn(columnName, dbSchema, schema.schema, reflectionData, context);
    return column.default(schema.defaultValue);
  }

  if (reflectionData.encrypted) {
    return bytea(columnName);
  }

  if (schema instanceof UuidSchema) {
    let column = uuid(columnName);

    if (schema.defaultRandom) {
      column = column.defaultRandom();
    }

    return column;
  }

  if (schema instanceof TimestampSchema) {
    return timestamp(columnName);
  }

  if (schema instanceof NumericDateSchema) {
    return numericDate(columnName);
  }

  if (schema instanceof NumberSchema) {
    return schema.integer
      ? integer(columnName)
      : doublePrecision(columnName);
  }

  if (schema instanceof StringSchema) {
    return text(columnName);
  }

  if (schema instanceof BooleanSchema) {
    return boolean(columnName);
  }

  if (schema instanceof EnumerationSchema) {
    const pgEnum = getPgEnum(dbSchema, schema.enumeration, context);
    return pgEnum(columnName);
  }

  if (schema instanceof JsonSchema) {
    return jsonb(columnName);
  }

  if (schema instanceof Uint8ArraySchema) {
    return bytea(columnName);
  }

  throw new NotSupportedError(`Schema "${schema.constructor.name}" not supported on type "${context.type.name}" for property "${context.property}"`);
}

const enumNames = new Map<Enumeration, string>();
const enums = new MultiKeyMap<[string, Enumeration], PgEnum<[string, ...string[]]>>();

export function registerEnum(enumeration: Enumeration, name: string): void {
  enumNames.set(enumeration, toSnakeCase(name));
}

export function getPgEnum(schema: string | PgSchema, enumeration: Enumeration, context?: ConverterContext): PgEnum<[string, ...string[]]> {
  const dbSchema = isString(schema) ? getDbSchema(schema) : schema;
  const enumName = enumNames.get(enumeration) ?? tryGetEnumName(enumeration as EnumerationObject);

  if (isUndefined(enumName)) {
    if (isDefined(context)) {
      throw new Error(`Enum is not registered. (type: ${context.type.name}, property: ${context.property})`);
    }

    throw new Error('Enum is not registered.');
  }

  const values = (isArray(enumeration) ? enumeration : enumValues(enumeration))
    .map((value) => value.toString()) as [string, ...string[]];

  const dbEnum = dbSchema.enum(toSnakeCase(enumName), values);

  if (enums.has([dbSchema.schemaName, enumeration])) {
    enums.set([dbSchema.schemaName, enumeration], dbEnum);
  }

  return dbEnum;
}

function getDefaultTableName(type: Type & Partial<Pick<EntityType, 'entityName'>>): string {
  return toSnakeCase(isString(type.entityName) ? type.entityName : type.name.replace(/\d+$/u, ''));
}
