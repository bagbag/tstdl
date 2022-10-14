/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type BooleanOptions = ValueSchemaOptions;

export function boolean(options: BooleanOptions = {}): ValueSchema<boolean> {
  return valueSchema<boolean>(globalThis.Boolean, options);
}

export function Boolean(options?: BooleanOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(boolean(options));
}
