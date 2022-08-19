/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { LiteralConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { ValueSchema } from '../types';
import { typeSchema, valueSchema } from '../types';
import { getValueType } from '../utils';

export function literal<T>(value: T): ValueSchema<T> {
  return valueSchema<any>(typeSchema(getValueType(value)), {
    valueConstraints: new LiteralConstraint(value)
  });
}

export function Literal(value: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(literal(value));
}
