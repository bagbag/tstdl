/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/index.js';
import { valueSchema } from '../types/index.js';

export type BooleanOptions = ValueSchemaOptions;

export function boolean(options: BooleanOptions = {}): ValueSchema<boolean> {
  return valueSchema<boolean>(Boolean, options);
}

export function BooleanProperty(options?: BooleanOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(boolean(options));
}
