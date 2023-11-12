/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { LiteralConstraint } from '../constraints/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';
import { getValueType } from '../utils/value-type.js';

export type LiteralOptions = ValueSchemaOptions;

export function literal<const T>(value: T, options?: LiteralOptions): ValueSchema<T> {
  const valueConstraints: SchemaValueConstraint[] = toArrayCopy(options?.valueConstraints ?? []);
  valueConstraints.push(new LiteralConstraint(value));

  return valueSchema(getValueType(value), {
    ...options,
    valueConstraints
  });
}

export function Literal(value: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(literal(value));
}
