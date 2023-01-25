import type { JsonPath } from '#/json-path/json-path';
import type { ConstraintContext, ConstraintResult } from './types';

export abstract class SchemaArrayConstraint {
  abstract validate(value: readonly unknown[], path: JsonPath, context: ConstraintContext): ConstraintResult;
}
