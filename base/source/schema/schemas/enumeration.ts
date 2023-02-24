/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { Enumeration as EnumerationType, EnumerationValue } from '#/types.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { EnumerationConstraint } from '../constraints/index.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';

export type EnumerationOptions = ValueSchemaOptions;

export function enumeration<T extends EnumerationType>(enumerationValue: T, options?: EnumerationOptions): ValueSchema<EnumerationValue<T>> {
  const valueConstraints: SchemaValueConstraint[] = toArrayCopy(options?.valueConstraints ?? []);

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
