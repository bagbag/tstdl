/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { createSchemaArrayConstraintDecorator } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SchemaArrayConstraint } from '../types/schema-array-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';

export class ArrayMaximumLengthConstraint extends SchemaArrayConstraint {
  private readonly maximumLength: number;

  readonly expects: string;

  constructor(maximumLength: number) {
    super();

    this.maximumLength = maximumLength;
    this.expects = `a maximum array length of ${this.maximumLength}`;
  }

  validate(value: any[], path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value.length > this.maximumLength) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `an array length of ${value.length}`, path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function ArrayMaximumLength(maximumLength: number): Decorator<'property' | 'accessor'> {
  return createSchemaArrayConstraintDecorator(new ArrayMaximumLengthConstraint(maximumLength));
}
