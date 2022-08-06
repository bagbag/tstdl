/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { Coercible, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type BooleanOptions = Coercible;

export function boolean(options: BooleanOptions = {}): ValueSchema<boolean> {
  return valueSchema({
    type: globalThis.Boolean,
    coerce: options.coerce
  });
}

export function Boolean(options?: BooleanOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(boolean(options));
}
