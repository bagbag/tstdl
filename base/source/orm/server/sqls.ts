import { sql, type SQL } from 'drizzle-orm';
import type { Uuid } from '../types.js';

export const TRANSACTION_TIMESTAMP = sql<Date>`transaction_timestamp()`;
export const RANDOM_UUID = sql<Uuid>`gen_random_uuid()`;

type IntervalUnit =
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
