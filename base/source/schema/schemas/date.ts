/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { toArrayCopy } from '#/utils/array/array';
import { isDefined } from '#/utils/type-guards';
import { MaximumDateConstraint, MinimumDateConstraint } from '../constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators';
import type { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ValueSchema, ValueSchemaOptions } from '../types/types';
import { valueSchema } from '../types/types';

export type DateOptions = ValueSchemaOptions & {
  minimum?: Date | number,
  maximum?: Date | number
};

export function date(options: DateOptions = {}): ValueSchema<Date> {
  const constraints: SchemaValueConstraint[] = toArrayCopy(options.valueConstraints ?? []);

  if (isDefined(options.minimum)) {
    constraints.push(new MinimumDateConstraint(options.minimum));
  }

  if (isDefined(options.maximum)) {
    constraints.push(new MaximumDateConstraint(options.maximum));
  }

  return valueSchema(Date, {
    ...options,
    valueConstraints: constraints
  });
}

export function DateProperty(options?: DateOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(date(options));
}
