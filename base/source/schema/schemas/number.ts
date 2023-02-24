/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import { integerConstraint } from '../constraints/integer.js';
import { MaximumConstraint } from '../constraints/maximum.js';
import { MinimumConstraint } from '../constraints/minimum.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/index.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';

export type NumberOptions = ValueSchemaOptions & {
  minimum?: number,
  maximum?: number,
  integer?: boolean
};

export function number(options: NumberOptions = {}): ValueSchema<number> {
  const valueConstraints: SchemaValueConstraint[] = toArrayCopy(options.valueConstraints ?? []);

  if (isDefined(options.minimum)) {
    valueConstraints.push(new MinimumConstraint(options.minimum));
  }

  if (isDefined(options.maximum)) {
    valueConstraints.push(new MaximumConstraint(options.maximum));
  }

  if (options.integer == true) {
    valueConstraints.push(integerConstraint);
  }

  return valueSchema<number>(Number, {
    ...options,
    valueConstraints
  });
}

export function NumberProperty(options?: NumberOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(number(options));
}
