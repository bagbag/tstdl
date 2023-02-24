/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueConstraintDecorator } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';
import { typeSchema } from '../types/types.js';

export class MaximumConstraint extends SchemaValueConstraint {
  private readonly maximum: number;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(maximum: number) {
    super();

    this.maximum = maximum;
    this.expects = `<= ${this.maximum}`;
  }

  validate(value: number, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value > this.maximum) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function Maximum(maximum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumConstraint(maximum), { schema: typeSchema(Number) });
}
