/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { TypedOmit } from '#/types';
import { toArray } from '#/utils/array/array';
import { isDefined, isFunction } from '#/utils/type-guards';
import type { ValueTypes } from '../types';
import { valueTypesToSchema } from '../utils';
import type { PropertyOptions } from './types';
import { createSchemaPropertyDecorator } from './utils';

export function Property(options?: PropertyOptions): Decorator<'property' | 'accessor'>;
export function Property(types?: () => ValueTypes, options?: TypedOmit<PropertyOptions, 'type'>): Decorator<'property' | 'accessor'>;
export function Property(optionsOrTypes: PropertyOptions | (() => ValueTypes) = {}, optionsOrNothing?: PropertyOptions): Decorator<'property' | 'accessor'> {
  const options: PropertyOptions = isFunction(optionsOrTypes) ? { type: { deferred: () => valueTypesToSchema(optionsOrTypes()) }, ...optionsOrNothing } : optionsOrTypes;

  return createSchemaPropertyDecorator({
    ...options,
    coercers: isDefined(options.coercers) ? toArray(options.coercers) : undefined,
    transformers: isDefined(options.transformers) ? toArray(options.transformers) : undefined,
    arrayConstraints: isDefined(options.arrayConstraints) ? toArray(options.arrayConstraints) : undefined,
    valueConstraints: isDefined(options.valueConstraints) ? toArray(options.valueConstraints) : undefined
  });
}
