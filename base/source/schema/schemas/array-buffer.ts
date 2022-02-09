import type { JsonPath } from '#/json-path';
import { isArray, isDefined, isNumber } from '#/utils/type-guards';
import { schemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';
import { instance } from './instance';

export type ArrayBufferSchemaDefinition = SchemaDefinition<'arrayBuffer', unknown, ArrayBuffer> & Coercible & {
  min?: number,
  max?: number
};

const arrayBufferInstanceSchema = instance(ArrayBuffer);

export class ArrayBufferSchemaValidator extends SchemaValidator<ArrayBufferSchemaDefinition> {
  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<ArrayBufferSchemaDefinition>> {
    const instanceTestResult = arrayBufferInstanceSchema[test](value, options, path);

    let buffer: ArrayBuffer;

    if (instanceTestResult.valid) {
      buffer = instanceTestResult.value;
    }
    else if ((this.schema.coerce ?? options.coerce) && isArray(value) && value.every((v) => isNumber(v) && Number.isInteger(v) && (v >= 0) && (v <= 255))) {
      buffer = Uint8Array.from(value).buffer;
    }
    else {
      return instanceTestResult;
    }

    if (isDefined(this.schema.min) && (buffer.byteLength < this.schema.min)) {
      return { valid: false, error: schemaError(`minimum buffer length is ${this.schema.min}`, path) };
    }

    if (isDefined(this.schema.max) && (buffer.byteLength > this.schema.max)) {
      return { valid: false, error: schemaError(`maximum buffer length is ${this.schema.max}`, path) };
    }

    return { valid: true, value: buffer };
  }
}

export function arrayBuffer(options?: SchemaOptions<ArrayBufferSchemaDefinition>): ArrayBufferSchemaValidator {
  const schema = schemaHelper<ArrayBufferSchemaDefinition>({
    type: 'arrayBuffer',
    ...options
  });

  return new ArrayBufferSchemaValidator(schema);
}
