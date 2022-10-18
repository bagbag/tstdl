import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { GenericConstraintFunction } from '../constraints/generic';
import { GenericConstraint } from '../constraints/generic';
import { createSchemaValueConstraintDecorator } from './utils';

// eslint-disable-next-line @typescript-eslint/naming-convention
export function Constraint<T>(constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): Decorator<'property' | 'accessor'> {
  const constraint = new GenericConstraint(constraintFunction, expects);
  return createSchemaValueConstraintDecorator(constraint);
}
