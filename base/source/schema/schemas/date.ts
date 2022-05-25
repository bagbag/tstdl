import type { JsonPath } from '#/json-path';
import { isDefined } from '#/utils/type-guards';
import { SchemaError, schemaError } from '../schema.error';
import type { CoercerMap, DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { instance } from './instance';

export type DateSchemaDefinition = SchemaDefinition<'uint8-array', unknown, Date> & Coercible & {
  min?: Date,
  max?: Date
};

const dateInstanceSchema = instance(Date);

const coercerMap: CoercerMap<Date> = {
  string: (string, path) => {
    const dateValue = new Date(string);

    if (Number.isNaN(dateValue.getTime())) {
      return { valid: false, error: SchemaError.couldNotCoerce('number', 'string', 'invalid format', path) };
    }

    return { valid: true, value: dateValue };
  },
  number: (number, path) => {
    const dateValue = new Date(number);

    if (Number.isNaN(dateValue.getTime())) {
      return { valid: false, error: SchemaError.couldNotCoerce('number', 'string', 'invalid timestamp', path) };
    }

    return { valid: true, value: dateValue };
  },
  bigint: (bigint, path) => {
    const numberValue = Number(bigint);
    const dateValue = new Date(numberValue);

    if (Number.isNaN(dateValue.getTime())) {
      return { valid: false, error: SchemaError.couldNotCoerce('number', 'string', 'invalid timestamp', path) };
    }

    return { valid: true, value: dateValue };
  }
};

export class DateSchemaValidator extends SchemaValidator<DateSchemaDefinition> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<DateSchemaDefinition>> {
    const result = super.ensureInstance(Date, value, path, { coerce: this.schema.coerce ?? options.coerce }, coercerMap);

    if (!result.valid) {
      return result;
    }

    const instanceTestResult = dateInstanceSchema[test](result.value, options, path);

    if (!instanceTestResult.valid) {
      return instanceTestResult;
    }

    const dateValue = instanceTestResult.value;

    if (isDefined(this.schema.min) && (dateValue < this.schema.min)) {
      return { valid: false, error: schemaError(`minimum date is ${this.schema.min.toISOString()}`, path) };
    }

    if (isDefined(this.schema.max) && (dateValue > this.schema.max)) {
      return { valid: false, error: schemaError(`maximum date is ${this.schema.max.toISOString()}`, path) };
    }

    return { valid: true, value: dateValue };
  }
}

export function date(options?: SchemaOptions<DateSchemaDefinition>): DateSchemaValidator {
  const schema = schemaHelper<DateSchemaDefinition>({
    type: 'uint8-array',
    ...options
  });

  return new DateSchemaValidator(schema);
}
