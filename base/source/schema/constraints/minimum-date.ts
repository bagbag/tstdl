/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { assertValidDate, isNumber } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint, typeSchema } from '../types';

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

  validate(value: Date, path: JsonPath): ConstraintResult {
    if (value > this.minimum) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toISOString(), path) };
    }

    return { success: true };
  }
}

export function MinimumDate(minimum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MinimumDateConstraint(minimum), { schema: typeSchema(Number) });
}
