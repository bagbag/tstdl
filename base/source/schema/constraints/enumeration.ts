/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Enumeration as EnumerationType, EnumerationValue, OneOrMany } from '#/types';
import { enumValues } from '#/utils';
import { distinct } from '#/utils/iterable-helpers';
import { isArray, isString } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';
import { getValueType } from '../utils';

export class EnumerationConstraint extends SchemaValueConstraint {
  private readonly allowedValuesSet: Set<EnumerationValue>;
  private readonly allowedValuesString: string;

  readonly enumeration: EnumerationType;
  readonly suitableTypes: SchemaValueConstraint['suitableTypes'];
  readonly expects: OneOrMany<string>;

  constructor(enumeration: EnumerationType) {
    super();

    this.enumeration = enumeration;

    const allowedValues = isArray(enumeration) ? enumeration : enumValues(enumeration);
    this.allowedValuesSet = new Set(allowedValues);
    this.allowedValuesString = allowedValues.map((value) => (isString(value) ? `"${value}"` : value)).join(', ');

    this.suitableTypes = [...distinct(allowedValues.map((value) => getValueType(value)))];
    this.expects = `one of [${this.allowedValuesString}]`;
  }

  validate(value: number, path: JsonPath): ConstraintResult {
    if (!this.allowedValuesSet.has(value)) {
      return { success: false, error: SchemaError.expectedButGot(this.expects, value.toString(), path) };
    }

    return { success: true };
  }
}
