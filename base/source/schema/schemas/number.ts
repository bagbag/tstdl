/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { toArrayCopy } from '#/utils/array/array';
import { isDefined } from '#/utils/type-guards';
import { integerConstraint } from '../constraints/integer';
import { MaximumConstraint } from '../constraints/maximum';
import { MinimumConstraint } from '../constraints/minimum';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ValueSchema, ValueSchemaOptions } from '../types/types';
import { valueSchema } from '../types/types';

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
