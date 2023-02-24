import type { JsonPath } from '#/json-path/json-path.js';
import type { OneOrMany } from '#/types.js';
import type { ConstraintContext, ConstraintResult, ValueType } from './types.js';

export abstract class SchemaValueConstraint {
  abstract readonly suitableTypes: OneOrMany<ValueType>;
  abstract readonly expects: OneOrMany<string>;

  abstract validate(value: unknown, path: JsonPath, context: ConstraintContext): ConstraintResult;
}
