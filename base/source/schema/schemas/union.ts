/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { assert } from '#/utils/type-guards';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Schema } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function union<T1, O1, T2, O2>(schema1: Schema<T1, O1>, schema2: Schema<T2, O2>): ValueSchema<T1 | T2, O1 | O2>;
export function union<T1, O1, T2, O2, T3, O3>(schema1: Schema<T1, O1>, schema2: Schema<T2, O2>, schema3: Schema<T3, O3>): ValueSchema<T1 | T2 | T3, O1 | O2 | O3>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4>(schema1: Schema<T1, O1>, schema2: Schema<T2, O2>, schema3: Schema<T3, O3>, schema4: Schema<T4, O4>): ValueSchema<T1 | T2 | T3 | T4, O1 | O2 | O3 | O4>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5>(schema1: Schema<T1, O1>, schema2: Schema<T2, O2>, schema3: Schema<T3, O3>, schema4: Schema<T4, O4>, schema5: Schema<T5, O5>): ValueSchema<T1 | T2 | T3 | T4 | T5, O1 | O2 | O3 | O4 | O5>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5, T6, O6>(schema1: Schema<T1, O1>, schema2: Schema<T2, O2>, schema3: Schema<T3, O3>, schema4: Schema<T4, O4>, schema5: Schema<T5, O5>, schema6: Schema<T6>): ValueSchema<T1 | T2 | T3 | T4 | T5 | T6, O1 | O2 | O3 | O4 | O5 | O6>;
export function union(...schemas: Schema[]): ValueSchema;
export function union(...schemas: Schema[]): ValueSchema {
  assert(schemas.length >= 2, 'Assign requires at least 2 schemas.');
  return valueSchema(schemas);
}

export function Union(...schemas: Schema[]): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(union(...schemas));
}
