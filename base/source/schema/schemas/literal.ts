/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { toArrayCopy } from '#/utils/array/array';
import { LiteralConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ValueSchema, ValueSchemaOptions } from '../types/types';
import { valueSchema } from '../types/types';
import { getValueType } from '../utils';

export type LiteralOptions = ValueSchemaOptions;

export function literal<T>(value: T, options?: LiteralOptions): ValueSchema<T> {
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
