/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { isDefined } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import type { SchemaValueConstraint } from '../types/schema-value-constraint';
import { MaximumLengthConstraint } from './maximum-length';
import { MinimumLengthConstraint } from './minimum-length';

export type LengthConstraintOptions = {
  minimum?: number,
  maximum?: number
};

export function Length(options: LengthConstraintOptions): Decorator<'property' | 'accessor'> {
  const constraints: SchemaValueConstraint[] = [];

  if (isDefined(options.minimum)) {
    constraints.push(new MinimumLengthConstraint(options.minimum));
  }

  if (isDefined(options.maximum)) {
    constraints.push(new MaximumLengthConstraint(options.maximum));
  }

  return createSchemaValueConstraintDecorator(constraints);
}
