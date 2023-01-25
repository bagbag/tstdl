/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';
import { typeSchema } from '../types/types';

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
