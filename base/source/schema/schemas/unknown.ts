/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { ValueSchema, ValueSchemaOptions } from '../types';
import { typeSchema, valueSchema } from '../types';

export type UnknownOptions = ValueSchemaOptions;

export function unknown(options?: UnknownOptions): ValueSchema<unknown> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return valueSchema(typeSchema('any'), options);
}

export function Unknown(options?: UnknownOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(unknown(options));
}
