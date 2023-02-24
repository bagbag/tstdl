/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { createSchemaValueConstraintDecorator } from '../decorators/utils.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';
import { typeSchema } from '../types/types.js';

export class IntegerConstraint extends SchemaValueConstraint {
  readonly suitableTypes = Number;
  readonly expects: string;

  constructor() {
    super();

    this.expects = 'an integer';
  }

  validate(value: number, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (!Number.isInteger(value)) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export const integerConstraint = new IntegerConstraint();

export function Integer(): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(integerConstraint, { schema: typeSchema(Number) });
}
