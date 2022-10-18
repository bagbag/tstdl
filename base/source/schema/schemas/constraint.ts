import type { OneOrMany } from '#/types';
import type { GenericConstraintFunction } from '../constraints/generic';
import { GenericConstraint } from '../constraints/generic';
import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';

export function constraint<T>(schema: SchemaTestable<T>, constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): ValueSchema<T> {
  return valueSchema(schema, {
    valueConstraints: new GenericConstraint(constraintFunction, expects)
  });
}
