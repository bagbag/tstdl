/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { Schema } from '../schema';
import type { Coercible } from '../types';
import { typeSchema, valueSchema } from '../types';

export type RegExpSchemaOptions = Coercible;

export function regexp(options: RegExpSchemaOptions = {}): Schema<globalThis.RegExp> {
  return valueSchema(typeSchema(globalThis.RegExp), {
    coerce: options.coerce
  });
}

export function RegExp(options?: RegExpSchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(regexp(options));
}
