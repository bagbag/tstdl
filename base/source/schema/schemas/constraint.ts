import type { OneOrMany } from '#/types';
import type { GenericConstraintFunction } from '../constraints/generic';
import { GenericConstraint } from '../constraints/generic';
import type { Schema } from '../schema';
import { valueSchema } from '../types';

export function constraint<T>(schema: Schema<T>, constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): Schema<T> {
  return valueSchema({
    type: schema,
    valueConstraints: new GenericConstraint(constraintFunction, expects)
  });
}

/* decorator is in file of GenericConstraint */
