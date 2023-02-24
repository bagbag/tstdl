import type { OneOrMany } from '#/types.js';
import type { GenericConstraintFunction } from '../constraints/generic.js';
import { GenericConstraint } from '../constraints/generic.js';
import type { SchemaTestable } from '../schema.js';
import type { ValueSchema } from '../types/index.js';
import { valueSchema } from '../types/index.js';

export function constraint<T>(schema: SchemaTestable<T>, constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): ValueSchema<T> {
  return valueSchema(schema, {
    valueConstraints: new GenericConstraint(constraintFunction, expects)
  });
}
