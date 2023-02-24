/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { assertValidDate, isNumber } from '#/utils/type-guards.js';
import { createSchemaValueConstraintDecorator } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';
import { typeSchema } from '../types/types.js';

export class MinimumDateConstraint extends SchemaValueConstraint {
  private readonly minimum: Date;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(minimum: Date | number) {
    super();

    this.minimum = isNumber(minimum) ? new Date(minimum) : minimum;
    this.expects = `>= ${this.minimum.toISOString()}`;

    assertValidDate(this.minimum);
  }

  validate(value: Date, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value > this.minimum) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toISOString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function MinimumDate(minimum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MinimumDateConstraint(minimum), { schema: typeSchema(Number) });
}
