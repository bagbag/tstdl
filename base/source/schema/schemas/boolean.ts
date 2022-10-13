/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Coercible, ValueSchema } from '../types';
import { typeSchema, valueSchema } from '../types';

export type BooleanOptions = Coercible;

export function boolean(options: BooleanOptions = {}): ValueSchema<boolean> {
  return valueSchema<boolean>(typeSchema(globalThis.Boolean), {
    coerce: options.coerce
  });
}

export function Boolean(options?: BooleanOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(boolean(options));
}
