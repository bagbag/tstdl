/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { assert } from '#/utils/type-guards';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function union<T1, O1, T2, O2>(schema1: ValueType<T1, O1>, schema2: ValueType<T2, O2>): ValueSchema<T1 | T2, O1 | O2>;
export function union<T1, O1, T2, O2, T3, O3>(schema1: ValueType<T1, O1>, schema2: ValueType<T2, O2>, schema3: ValueType<T3, O3>): ValueSchema<T1 | T2 | T3, O1 | O2 | O3>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4>(schema1: ValueType<T1, O1>, schema2: ValueType<T2, O2>, schema3: ValueType<T3, O3>, schema4: ValueType<T4, O4>): ValueSchema<T1 | T2 | T3 | T4, O1 | O2 | O3 | O4>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5>(schema1: ValueType<T1, O1>, schema2: ValueType<T2, O2>, schema3: ValueType<T3, O3>, schema4: ValueType<T4, O4>, schema5: ValueType<T5, O5>): ValueSchema<T1 | T2 | T3 | T4 | T5, O1 | O2 | O3 | O4 | O5>;
export function union<T1, O1, T2, O2, T3, O3, T4, O4, T5, O5, T6, O6>(schema1: ValueType<T1, O1>, schema2: ValueType<T2, O2>, schema3: ValueType<T3, O3>, schema4: ValueType<T4, O4>, schema5: ValueType<T5, O5>, schema6: ValueType<T6>): ValueSchema<T1 | T2 | T3 | T4 | T5 | T6, O1 | O2 | O3 | O4 | O5 | O6>;
export function union(...schemas: ValueType[]): ValueSchema;
export function union(...schemas: ValueType[]): ValueSchema {
  assert(schemas.length >= 2, 'Assign requires at least 2 schemas.');

  return valueSchema({
    type: schemas
  });
}

export function Union(...schemas: ValueType[]): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(union(...schemas));
}
