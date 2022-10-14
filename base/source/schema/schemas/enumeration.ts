/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { Enumeration as EnumerationType, EnumerationValue } from '#/types';
import { toArray } from '#/utils/array/array';
import { EnumerationConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { SchemaValueConstraint, ValueSchema, ValueSchemaOptions } from '../types';
import { valueSchema } from '../types';

export type EnumerationOptions = ValueSchemaOptions;

export function enumeration<T extends EnumerationType>(enumerationValue: T, options?: EnumerationOptions): ValueSchema<EnumerationValue<T>> {
  const valueConstraints: SchemaValueConstraint[] = toArray(options?.valueConstraints ?? []);

  const enumerationConstraint = new EnumerationConstraint(enumerationValue);
  valueConstraints.push(enumerationConstraint);

  return valueSchema(enumerationConstraint.suitableTypes, {
    ...options,
    valueConstraints
  });
}

export function Enumeration(enumerationValue: EnumerationType, options?: EnumerationOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(enumeration(enumerationValue, options));
}
