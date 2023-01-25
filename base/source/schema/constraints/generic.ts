/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany } from '#/types';
import { isBoolean } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';

export type GenericConstraintResult =
  | { success: true, error?: undefined }
  | { success: false, error: string | SchemaError };

export type GenericConstraintFunction<T> = (value: T, path: JsonPath) => boolean | ConstraintResult;

export class GenericConstraint<T> extends SchemaValueConstraint {
  readonly suitableTypes = Number;
  readonly expects: OneOrMany<string>;
  readonly constraintFunction: GenericConstraintFunction<T>;

  constructor(constraintFunction: GenericConstraintFunction<T>, expects: OneOrMany<string> = 'valid value') {
    super();

    this.constraintFunction = constraintFunction;
    this.expects = expects;
  }

  validate(value: T, path: JsonPath, context: ConstraintContext): ConstraintResult {
    const result = this.constraintFunction(value, path);

    if (isBoolean(result)) {
      return result
        ? { valid: true }
        : { valid: false, error: SchemaError.expectedButGot(this.expects, 'invalid value', path, { fast: context.options.fastErrors }) };
    }

    return result;
  }
}
