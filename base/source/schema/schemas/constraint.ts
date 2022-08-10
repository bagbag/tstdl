import type { OneOrMany } from '#/types';
import type { GenericConstraintFunction } from '../constraints/generic';
import { GenericConstraint } from '../constraints/generic';
import type { Schema } from '../schema';
import { valueSchema } from '../types';

export function constraint<T, O>(schema: Schema<T, O>, constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): Schema<T, O> {
  return valueSchema({
    type: schema,
    valueConstraints: new GenericConstraint(constraintFunction, expects)
  });
}

/* decorator is in file of GenericConstraint */
