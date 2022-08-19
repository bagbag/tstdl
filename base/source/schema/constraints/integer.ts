/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint, typeSchema } from '../types';

export class IntegerConstraint extends SchemaValueConstraint {
  readonly suitableTypes = Number;
  readonly expects: string;

  constructor() {
    super();

    this.expects = 'an integer';
  }

  validate(value: number, path: JsonPath): ConstraintResult {
    if (!Number.isInteger(value)) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path) };
    }

    return { success: true };
  }
}

export const integerConstraint = new IntegerConstraint();

export function Integer(): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(integerConstraint, { schema: typeSchema(Number) });
}
