import type { JsonPath } from '#/json-path';
import { isArray, isDefined, isNumber } from '#/utils/type-guards';
import { schemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { instance } from './instance';

export type Uint8ArraySchemaDefinition = SchemaDefinition<'uint8-array', unknown, Uint8Array> & Coercible & {
  min?: number,
  max?: number
};

const uint8ArrayInstanceSchema = instance(Uint8Array);

export class Uint8ArraySchemaValidator extends SchemaValidator<Uint8ArraySchemaDefinition> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<Uint8ArraySchemaDefinition>> {
    const instanceTestResult = uint8ArrayInstanceSchema[test](value, options, path);

    let array: Uint8Array;

    if (instanceTestResult.valid) {
      array = instanceTestResult.value;
    }
    else if ((this.schema.coerce ?? options.coerce) && isArray(value) && value.every((v) => isNumber(v) && Number.isInteger(v) && (v >= 0) && (v <= 255))) {
      array = Uint8Array.from(value);
    }
    else {
      return instanceTestResult;
    }

    if (isDefined(this.schema.min) && (array.byteLength < this.schema.min)) {
      return { valid: false, error: schemaError(`minimum buffer length is ${this.schema.min}`, path) };
    }

    if (isDefined(this.schema.max) && (array.byteLength > this.schema.max)) {
      return { valid: false, error: schemaError(`maximum buffer length is ${this.schema.max}`, path) };
    }

    return { valid: true, value: array };
  }
}

export function uint8Array(options?: SchemaOptions<Uint8ArraySchemaDefinition>): Uint8ArraySchemaValidator {
  const schema = schemaHelper<Uint8ArraySchemaDefinition>({
    type: 'uint8-array',
    ...options
  });

  return new Uint8ArraySchemaValidator(schema);
}
