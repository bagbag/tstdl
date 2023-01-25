/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { assertValidDate, isNumber } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';
import { typeSchema } from '../types/types';

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
