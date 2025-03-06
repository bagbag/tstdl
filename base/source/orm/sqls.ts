import { sql, type Column, type SQL } from 'drizzle-orm';
import type { GetSelectTableSelection, SelectResultField, TableLike } from 'drizzle-orm/query-builders/select.types';
import type { Uuid } from './types.js';

export const TRANSACTION_TIMESTAMP = sql<Date>`transaction_timestamp()`;
export const RANDOM_UUID = sql<Uuid>`gen_random_uuid()`;

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

export function interval(value: number, unit: IntervalUnit): SQL {
  return sql`(${value} ||' ${sql.raw(unit)}')::interval`;
}

export function arrayAgg<T extends Column>(column: T): SQL<SelectResultField<T>[]> {
  return sql`array_agg(${column})`;
}

export function jsonAgg<T extends TableLike>(tableOrColumn: T): SQL<SelectResultField<GetSelectTableSelection<T>>[]> {
  return sql`json_agg(${tableOrColumn})`;
}

jsonAgg.withNull = (jsonAgg as <T extends TableLike>(tableOrColumn: T) => SQL<(SelectResultField<GetSelectTableSelection<T>> | null)[]>);

export function coalesce<T extends (Column | SQL)[]>(...columns: T): SQL<SelectResultField<T>[number]> {
  return sql`coalesce(${sql.join(columns, sql.raw(', '))})`;
}

export function toJsonb<T extends (Column | SQL)>(column: T): SQL<SelectResultField<T>> {
  return sql`to_jsonb(${column})`;
}

export function numNulls(...columns: Column[]): SQL<number> {
  return sql`num_nulls(${sql.join(columns, sql.raw(', '))})`;
}

export function numNonNulls(...columns: Column[]): SQL<number> {
  return sql`num_nonnulls(${sql.join(columns, sql.raw(', '))})`;
}
