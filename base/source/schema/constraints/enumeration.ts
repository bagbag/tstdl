/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Enumeration, EnumerationValue, OneOrMany } from '#/types';
import { enumValues } from '#/utils/enum';
import { distinct } from '#/utils/iterable-helpers/distinct';
import { isArray, isString } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import { SchemaValueConstraint } from '../types/schema-value-constraint';
import type { ConstraintContext, ConstraintResult } from '../types/types';
import { getValueType } from '../utils/value-type';

export class EnumerationConstraint extends SchemaValueConstraint {
  private readonly allowedValuesString: string;

  readonly enumeration: Enumeration;
  readonly allowedValuesSet: Set<EnumerationValue>;
  readonly suitableTypes: SchemaValueConstraint['suitableTypes'];
  readonly expects: OneOrMany<string>;

  constructor(enumeration: Enumeration) {
    super();

    this.enumeration = enumeration;

    const allowedValues = isArray(enumeration) ? enumeration : enumValues(enumeration);
    this.allowedValuesSet = new Set(allowedValues);
    this.allowedValuesString = allowedValues.map((value) => (isString(value) ? `"${value}"` : value)).join(', ');

    this.suitableTypes = [...distinct(allowedValues.map((value) => getValueType(value)))];
    this.expects = `one of [${this.allowedValuesString}]`;
  }

  validate(value: number, path: JsonPath, context: ConstraintContext): ConstraintResult {
    if (!this.allowedValuesSet.has(value)) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}
