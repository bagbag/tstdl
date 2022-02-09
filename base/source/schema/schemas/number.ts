import type { JsonPath } from '#/json-path';
import { numberPattern } from '#/utils/patterns';
import { isDefined } from '#/utils/type-guards';
import { SchemaError, schemaError } from '../schema.error';
import type { CoercerMap, DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

const coercerMap: CoercerMap<number> = {
  string: (string, path) => {
    const isNumberString = numberPattern.test(string);
    const numberValue = Number(string);

    if (!isNumberString || Number.isNaN(numberValue)) {
      return { valid: false, error: SchemaError.couldNotCoerce('number', 'string', 'invalid format', path) };
    }

    return { valid: true, value: numberValue };
  },
  boolean: (boolean) => ({ valid: true, value: Number(boolean) }),
  bigint: (bigint, path) => {
    const numberValue = Number(bigint);

    if (!Number.isFinite(numberValue)) {
      return { valid: false, error: SchemaError.couldNotCoerce('number', 'bigint', 'value out of bounds', path) };
    }

    return { valid: true, value: numberValue };
  }
};

export type NumberSchemaDefinition = SchemaDefinition<'number', unknown, number> & Coercible & {
  /** integer */
  integer?: boolean,

  /** min */
  min?: number,

  /** max */
  max?: number
};

export class NumberSchemaValidator extends SchemaValidator<NumberSchemaDefinition> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<number> {
    const result = super.ensureType('number', value, path, { coerce: this.schema.coerce ?? options.coerce }, coercerMap);

    if (!result.valid) {
      return result;
    }

    if ((this.schema.integer == true) && !Number.isInteger(result.value)) {
      return { valid: false, error: schemaError('expected integer', path) };
    }

    if (isDefined(this.schema.min) && (result.value < this.schema.min)) {
      return { valid: false, error: schemaError(`minimum valid value is ${this.schema.min}`, path) };
    }

    if (isDefined(this.schema.max) && (result.value > this.schema.max)) {
      return { valid: false, error: schemaError(`maximum valid value is ${this.schema.max}`, path) };
    }

    return { valid: true, value: result.value };
  }
}

export function number(options?: SchemaOptions<NumberSchemaDefinition>): NumberSchemaValidator {
  const schema = schemaHelper<NumberSchemaDefinition>({
    type: 'number',
    ...options
  });

  return new NumberSchemaValidator(schema);
}
