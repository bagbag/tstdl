/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint, typeSchema } from '../types';

export class MinimumConstraint extends SchemaValueConstraint {
  private readonly minimum: number;

  readonly suitableTypes = Number;
  readonly expects: string;

  constructor(minimum: number) {
    super();

    this.minimum = minimum;
    this.expects = `>= ${this.minimum}`;
  }

  validate(value: number, path: JsonPath): ConstraintResult {
    if (value < this.minimum) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path) };
    }

    return { success: true };
  }
}

export function Minimum(minimum: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MinimumConstraint(minimum), { schema: typeSchema(Number) });
}
