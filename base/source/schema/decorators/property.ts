/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany, TypedOmit } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { isDefined, isFunction, isString, isUndefined } from '#/utils/type-guards.js';
import type { ValueType } from '../types/index.js';
import { typeSchema } from '../types/index.js';
import type { PropertyOptions } from './types.js';
import { createSchemaPropertyDecorator } from './utils.js';

export function Property(options?: PropertyOptions): Decorator<'property' | 'accessor'>;
export function Property(schema?: OneOrMany<ValueType>, options?: TypedOmit<PropertyOptions, 'schema'>): Decorator<'property' | 'accessor'>;
export function Property(optionsOrTypes: PropertyOptions | OneOrMany<ValueType> = {}, optionsOrNothing?: PropertyOptions): Decorator<'property' | 'accessor'> {
  const schema = (isFunction(optionsOrTypes) || isString(optionsOrTypes)) ? typeSchema(optionsOrTypes) : undefined;
  const options = isUndefined(schema) ? (optionsOrTypes as PropertyOptions) : optionsOrNothing ?? ({} as PropertyOptions);

  return createSchemaPropertyDecorator({
    schema,
    ...options,
    coercers: isDefined(options.coercers) ? toArray(options.coercers) : undefined,
    transformers: isDefined(options.transformers) ? toArray(options.transformers) : undefined,
    arrayConstraints: isDefined(options.arrayConstraints) ? toArray(options.arrayConstraints) : undefined,
    valueConstraints: isDefined(options.valueConstraints) ? toArray(options.valueConstraints) : undefined
  });
}
