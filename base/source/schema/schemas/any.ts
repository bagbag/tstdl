/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/index.js';
import { valueSchema } from '../types/index.js';

export type AnyOptions = ValueSchemaOptions;

export function any(options?: AnyOptions): ValueSchema<any> { // eslint-disable-line @typescript-eslint/no-unnecessary-type-arguments
  return valueSchema('any', options);
}

export function Any(options?: AnyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(any(options));
}
