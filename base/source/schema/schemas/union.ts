/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { assert, isArray } from '#/utils/type-guards';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { SchemaTestable } from '../schema';
import type { SchemaOutput, ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type UnionOptions = ValueSchemaOptions;

export function union<T extends SchemaTestable[]>(...schemas: [...T]): ValueSchema<SchemaOutput<T[number]>>;
export function union<T extends SchemaTestable[]>(schemas: [...T], options?: UnionOptions): ValueSchema<SchemaOutput<T[number]>>;
export function union<T extends SchemaTestable[]>(...args: T | [schemas: T, options?: UnionOptions]): ValueSchema<SchemaOutput<T[number]>> {
  const schemas = isArray(args[0]) ? args[0] : args as T;
  const options = isArray(args[0]) ? args[1] as UnionOptions : undefined;

  assert(schemas.length >= 2, 'Union requires at least 2 schemas.');
  return valueSchema(schemas, options);
}

export function Union(...schemas: SchemaTestable[]): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(union(...schemas));
}
