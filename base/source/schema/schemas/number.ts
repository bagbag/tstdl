/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { isDefined } from '#/utils/type-guards';
import { integerConstraint } from '../constraints/integer';
import { MaximumConstraint } from '../constraints/maximum';
import { MinimumConstraint } from '../constraints/minimum';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { Coercible, SchemaValueConstraint, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type NumberOptions = Coercible & {
  minimum?: number,
  maximum?: number,
  integer?: boolean
};

export function number(options: NumberOptions = {}): ValueSchema<number> {
  const constraints: SchemaValueConstraint[] = [];

  if (isDefined(options.minimum)) {
    constraints.push(new MinimumConstraint(options.minimum));
  }

  if (isDefined(options.maximum)) {
    constraints.push(new MaximumConstraint(options.maximum));
  }

  if (options.integer == true) {
    constraints.push(integerConstraint);
  }

  return valueSchema<number>({
    type: globalThis.Number,
    array: false,
    optional: false,
    nullable: false,
    coerce: options.coerce,
    valueConstraints: constraints
  });
}

export function Number(options?: NumberOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(number(options));
}
