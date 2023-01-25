/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaArrayConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import { SchemaArrayConstraint } from '../types/schema-array-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';

export class MinimumArrayLengthConstraint extends SchemaArrayConstraint {
  private readonly minimumLength: number;

  readonly expects: string;

  constructor(minimumLength: number) {
    super();

    this.minimumLength = minimumLength;
    this.expects = `a minimum array length of ${this.minimumLength}`;
  }

  validate(value: any[], path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (value.length < this.minimumLength) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `an array length of ${value.length}`, path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function MinimumArrayLength(minimumLength: number): Decorator<'property' | 'accessor'> {
  return createSchemaArrayConstraintDecorator(new MinimumArrayLengthConstraint(minimumLength));
}
