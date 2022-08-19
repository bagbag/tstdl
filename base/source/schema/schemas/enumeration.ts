/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { Enumeration as EnumerationType, EnumerationValue } from '#/types';
import { EnumerationConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { Coercible, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type EnumerationOptions = Coercible;

export function enumeration<T extends EnumerationType>(enumerationValue: T, options: EnumerationOptions = {}): ValueSchema<EnumerationValue<T>> {
  const enumerationConstraint = new EnumerationConstraint(enumerationValue);

  return valueSchema(enumerationConstraint.suitableTypes, {
    coerce: options.coerce,
    valueConstraints: enumerationConstraint
  });
}

export function Enumeration(enumerationValue: EnumerationType, options: EnumerationOptions = {}): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(enumeration(enumerationValue, options));
}
