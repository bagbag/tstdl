/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { Schema } from '../schema.js';
import { valueSchema } from '../types/index.js';
import type { ValueSchemaOptions } from '../types/types.js';

export type RegExpSchemaOptions = ValueSchemaOptions;

export function regexp(options?: RegExpSchemaOptions): Schema<RegExp> {
  return valueSchema(RegExp, options);
}

export function RegExpProperty(options?: RegExpSchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(regexp(options));
}
