import type { JsonPath } from '#/json-path/json-path.js';
import type { ConstraintContext, ConstraintResult } from './types.js';

export abstract class SchemaArrayConstraint {
  abstract validate(value: readonly unknown[], path: JsonPath, context: ConstraintContext): ConstraintResult;
}
