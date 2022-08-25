import type { OneOrMany, Record } from '#/types';
import type { Simplify } from 'type-fest';
import type { ObjectSchema } from '../types';
import { omit } from './omit';

/**
 * @deprecated use {@link omit}
 */
export function exclude<T extends Record, K extends keyof T>(schema: ObjectSchema<T>, keys: OneOrMany<K>): ObjectSchema<Simplify<Omit<T, K>>> {
  return omit(schema, keys);
}
