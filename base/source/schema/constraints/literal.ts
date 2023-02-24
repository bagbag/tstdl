/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import { isPrimitive } from '#/utils/type-guards.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';
import { getValueType, getValueTypeName } from '../utils/value-type.js';

export class LiteralConstraint extends SchemaValueConstraint {
  readonly literal: any;
  readonly suitableTypes: SchemaValueConstraint['suitableTypes'];
  readonly expects: string;

  constructor(literal: any) {
    super();

    this.literal = literal;

    this.suitableTypes = getValueType(literal);
    const literalName = isPrimitive(literal) ? String(literal) : getValueTypeName(this.suitableTypes);
    this.expects = `literal ${literalName}`;
  }

  validate(value: any, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value !== this.literal) {
      const valueType = getValueType(value);
      return { valid: false, error: SchemaError.expectedButGot(this.expects, getValueTypeName(valueType), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}
