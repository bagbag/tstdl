/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { assertValidDate, isNumber } from '#/utils/type-guards.js';
import { createSchemaValueConstraintDecorator } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';
import { typeSchema } from '../types/types.js';

export class MaximumDateConstraint extends SchemaValueConstraint {
  private readonly maximum: Date;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(maximum: Date | number) {
    super();

    this.maximum = isNumber(maximum) ? new Date(maximum) : maximum;
    this.expects = `<= ${this.maximum.toISOString()}`;

    assertValidDate(this.maximum);
  }

  validate(value: Date, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value > this.maximum) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toISOString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function MaximumDate(maximum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumDateConstraint(maximum), { schema: typeSchema(Number) });
}
