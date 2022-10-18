/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Schema } from '../schema';
import type { ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type RegExpSchemaOptions = ValueSchemaOptions;

export function regexp(options?: RegExpSchemaOptions): Schema<RegExp> {
  return valueSchema(RegExp, options);
}

export function RegExpProperty(options?: RegExpSchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(regexp(options));
}
