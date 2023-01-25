/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { assertValidDate, isNumber } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';
import { typeSchema } from '../types/types';

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
