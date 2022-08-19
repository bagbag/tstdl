/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { assertValidDate, isNumber } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

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

  validate(value: Date, path: JsonPath): ConstraintResult {
    if (value > this.maximum) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toISOString(), path) };
    }

    return { success: true };
  }
}

export function MaximumDate(maximum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumDateConstraint(maximum), { schema: Number });
}
