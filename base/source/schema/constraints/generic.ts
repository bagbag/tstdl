/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import { isBoolean } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

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

  validate(value: T, path: JsonPath): ConstraintResult {
    const result = this.constraintFunction(value, path);

    if (isBoolean(result)) {
      return result
        ? { success: true }
        : { success: false, error: SchemaError.expectedButGot(this.expects, 'invalid value', path) };
    }

    return result;
  }
}

export function Constraint<T>(constraintFunction: GenericConstraintFunction<T>, expects?: OneOrMany<string>): Decorator<'property' | 'accessor'> {
  const constraint = new GenericConstraint(constraintFunction, expects);
  return createSchemaValueConstraintDecorator(constraint);
}
