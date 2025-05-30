/**
 * @module
 * Provides utility SQL functions and constants for use with Drizzle ORM,
 * simplifying common SQL operations like generating UUIDs, working with intervals,
 * and aggregating data.
 */
import { isNumber } from '#/utils/type-guards.js';
import { sql, Table, type AnyColumn, type Column, type SQL } from 'drizzle-orm';
import type { GetSelectTableSelection, SelectResultField, TableLike } from 'drizzle-orm/query-builders/select.types';
import type { Uuid } from './types.js';

/** Drizzle SQL helper for getting the current transaction's timestamp. Returns a Date object. */
export const TRANSACTION_TIMESTAMP = sql<Date>`transaction_timestamp()`;

/** Drizzle SQL helper for generating a random UUID (v4). Returns a Uuid string. */
export const RANDOM_UUID = sql<Uuid>`gen_random_uuid()`;

/** Represents valid units for PostgreSQL interval values. */
export type IntervalUnit =
  | 'millennium' | 'millenniums' | 'millennia'
  | 'century' | 'centuries'
  | 'decade' | 'decades'
  | 'year' | 'years'
  | 'day' | 'days'
  | 'hour' | 'hours'
  | 'minute' | 'minutes'
  | 'second' | 'seconds'
  | 'millisecond' | 'milliseconds'
  | 'microsecond' | 'microseconds';

export function autoAlias<T>(column: AnyColumn<{ data: T }>): SQL.Aliased<T> {
  return sql<T>`${column}`.as(`${(column.table as any)[(Table as any)['Symbol']['Name']]}_${column.name}`);
}

/**
 * Creates a Drizzle SQL interval expression.
 * @param value - The numeric value of the interval.
 * @param unit - The unit of the interval (e.g., 'day', 'hour').
 * @returns A Drizzle SQL object representing the interval.
 */
export function interval(value: number, unit: IntervalUnit): SQL {
  return sql`(${value} ||' ${sql.raw(unit)}')::interval`;
}

/**
 * Creates a Drizzle SQL `array_agg` aggregate function call.
 * Aggregates values from a column into a PostgreSQL array.
 * @template T - The Drizzle column type.
 * @param column - The column to aggregate.
 * @returns A Drizzle SQL object representing the aggregated array.
 */
export function arrayAgg<T extends Column>(column: T): SQL<SelectResultField<T>[]> {
  return sql`array_agg(${column})`;
}

/**
 * Creates a Drizzle SQL `json_agg` aggregate function call.
 * Aggregates rows or column values into a JSON array.
 * @template T - The Drizzle table or column type.
 * @param tableOrColumn - The table or column to aggregate into JSON.
 * @returns A Drizzle SQL object representing the JSON aggregated array.
 */
export function jsonAgg<T extends TableLike>(tableOrColumn: T): SQL<SelectResultField<GetSelectTableSelection<T>>[]> {
  return sql`json_agg(${tableOrColumn})`;
}

/**
 * Variant of `jsonAgg` that includes null values in the resulting JSON array.
 * @template T - The Drizzle table or column type.
 * @param tableOrColumn - The table or column to aggregate into JSON.
 * @returns A Drizzle SQL object representing the JSON aggregated array, potentially containing nulls.
 */
jsonAgg.withNull = (jsonAgg as <T extends TableLike>(tableOrColumn: T) => SQL<(SelectResultField<GetSelectTableSelection<T>> | null)[]>);

/**
 * Creates a Drizzle SQL `coalesce` function call.
 * Returns the first non-null value from the provided list of columns or SQL expressions.
 * @template T - An array type of Drizzle Columns or SQL expressions.
 * @param columns - The columns or SQL expressions to check.
 * @returns A Drizzle SQL object representing the coalesced value.
 */
export function coalesce<T extends (Column | SQL)[]>(...columns: T): SQL<SelectResultField<T>[number]> {
  return sql`coalesce(${sql.join(columns, sql.raw(', '))})`;
}

/**
 * Creates a Drizzle SQL `to_jsonb` function call.
 * Converts the input column or SQL expression to a JSONB value.
 * @template T - The Drizzle column or SQL expression type.
 * @param column - The column or SQL expression to convert.
 * @returns A Drizzle SQL object representing the value as JSONB.
 */
export function toJsonb<T extends (Column | SQL)>(column: T): SQL<SelectResultField<T>> {
  return sql`to_jsonb(${column})`;
}

/**
 * Creates a Drizzle SQL `num_nulls` function call.
 * Counts the number of null arguments.
 * @param columns - The columns to check for nulls.
 * @returns A Drizzle SQL object representing the count of nulls.
 */
export function numNulls(...columns: Column[]): SQL<number> {
  return sql`num_nulls(${sql.join(columns, sql.raw(', '))})`;
}

/**
 * Creates a Drizzle SQL `num_nonnulls` function call.
 * Counts the number of non-null arguments.
 * @param columns - The columns to check for non-nulls.
 * @returns A Drizzle SQL object representing the count of non-nulls.
 */
export function numNonNulls(...columns: Column[]): SQL<number> {
  return sql`num_nonnulls(${sql.join(columns, sql.raw(', '))})`;
}

export function least<T extends (Column | SQL | number)[]>(...values: T): SQL<SelectResultField<{ [P in keyof T]: T[P] extends number ? Exclude<T[P], number> | SQL<number> : T[P] }[number]>>;
export function least<T>(...values: T[]): SQL<SelectResultField<T>>;
export function least<T extends (Column | SQL | number)[]>(...values: T): SQL<SelectResultField<{ [P in keyof T]: T[P] extends number ? Exclude<T[P], number> | SQL<number> : T[P] }[number]>> {
  const sqlValues = values.map((value) => isNumber(value) ? sql.raw(String(value)) : value);
  return sql`least(${sql.join(sqlValues, sql.raw(', '))})`;
}

export function greatest<T extends (Column | SQL | number)[]>(...values: T): SQL<SelectResultField<{ [P in keyof T]: T[P] extends number ? Exclude<T[P], number> | SQL<number> : T[P] }[number]>>;
export function greatest<T>(...values: T[]): SQL<SelectResultField<T>>;
export function greatest<T extends (Column | SQL | number)[]>(...values: T): SQL<SelectResultField<{ [P in keyof T]: T[P] extends number ? Exclude<T[P], number> | SQL<number> : T[P] }[number]>> {
  const sqlValues = values.map((value) => isNumber(value) ? sql.raw(String(value)) : value);
  return sql`greatest(${sql.join(sqlValues, sql.raw(', '))})`;
}
