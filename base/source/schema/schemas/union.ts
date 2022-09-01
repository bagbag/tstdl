/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { assert } from '#/utils/type-guards';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Schema } from '../schema';
import type { SchemaInput, SchemaOutput, ValueSchema } from '../types';
import { valueSchema } from '../types';

export function union<T extends Schema[]>(...schemas: [...T]): ValueSchema<SchemaInput<T[number]>, SchemaOutput<T[number]>>;
export function union(...schemas: Schema[]): ValueSchema {
  assert(schemas.length >= 2, 'Assign requires at least 2 schemas.');
  return valueSchema(schemas);
}

export function Union(...schemas: Schema[]): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(union(...schemas));
}
