/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { isDefined } from '#/utils/type-guards';
import { MaximumDateConstraint, MinimumDateConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { Coercible, SchemaValueConstraint, ValueSchema } from '../types';
import { typeSchema, valueSchema } from '../types';

export type DateOptions = Coercible & {
  minimum?: Date | number,
  maximum?: Date | number
};

export function date(options: DateOptions = {}): ValueSchema<Date> {
  const constraints: SchemaValueConstraint[] = [];

  if (isDefined(options.minimum)) {
    constraints.push(new MinimumDateConstraint(options.minimum));
  }

  if (isDefined(options.maximum)) {
    constraints.push(new MaximumDateConstraint(options.maximum));
  }

  return valueSchema(typeSchema(globalThis.Date), {
    coerce: options.coerce,
    valueConstraints: constraints
  });
}

export function Date(options?: DateOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(date(options));
}
