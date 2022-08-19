/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

export class MaximumConstraint extends SchemaValueConstraint {
  private readonly maximum: number;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(maximum: number) {
    super();

    this.maximum = maximum;
    this.expects = `<= ${this.maximum}`;
  }

  validate(value: number, path: JsonPath): ConstraintResult {
    if (value > this.maximum) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path) };
    }

    return { success: true };
  }
}

export function Maximum(maximum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumConstraint(maximum), { schema: Number });
}
