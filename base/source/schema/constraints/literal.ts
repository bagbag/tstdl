/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import { isPrimitive } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';
import { getValueType, getValueTypeName } from '../utils';

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

  validate(value: any, path: JsonPath): ConstraintResult {
    if (value !== this.literal) {
      const valueType = getValueType(value);
      return { success: false, error: SchemaError.expectedButGot(this.expects, getValueTypeName(valueType), path) };
    }

    return { success: true };
  }
}
