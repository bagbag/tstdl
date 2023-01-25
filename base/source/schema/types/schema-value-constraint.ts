import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany } from '#/types';
import type { ConstraintContext, ConstraintResult, ValueType } from './types';

export abstract class SchemaValueConstraint {
  abstract readonly suitableTypes: OneOrMany<ValueType>;
  abstract readonly expects: OneOrMany<string>;

  abstract validate(value: unknown, path: JsonPath, context: ConstraintContext): ConstraintResult;
}
