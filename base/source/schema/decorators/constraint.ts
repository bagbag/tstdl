import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany } from '#/types.js';
import type { GenericConstraintFunction } from '../constraints/generic.js';
import { GenericConstraint } from '../constraints/generic.js';
import { createSchemaValueConstraintDecorator } from './utils.js';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Constraint<T>(constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): Decorator<'property' | 'accessor'> {
  const constraint = new GenericConstraint(constraintFunction, expects);
  return createSchemaValueConstraintDecorator(constraint);
}
