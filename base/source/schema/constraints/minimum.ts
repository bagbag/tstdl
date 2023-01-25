/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';
import { typeSchema } from '../types/types';

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
