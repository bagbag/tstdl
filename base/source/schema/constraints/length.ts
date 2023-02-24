/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { isDefined } from '#/utils/type-guards.js';
import { createSchemaValueConstraintDecorator } from '../decorators/utils.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import { MaximumLengthConstraint } from './maximum-length.js';
import { MinimumLengthConstraint } from './minimum-length.js';

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
