/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueConstraintDecorator } from '../decorators/utils.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import { typeSchema, type ConstraintContext, type ConstraintResult } from '../types/types.js';

export class MinimumConstraint extends SchemaValueConstraint {
  private readonly minimum: number;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(minimum: number) {
    super();

    this.minimum = minimum;
    this.expects = `>= ${this.minimum}`;
  }

  validate(value: number, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value < this.minimum) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function Minimum(minimum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MinimumConstraint(minimum), { schema: typeSchema(Number) });
}
