import type { JsonPath } from '#/json-path/json-path';
import { Schema } from '../schema';
import { SchemaError } from '../schema.error';
import { array, number } from '../schemas';
import type { CoercerContext, CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

const byteNumberArraySchema = array(number({ integer: true, minimum: 0, maximum: 255 }));

export class Uint8ArrayCoercer extends SchemaValueCoercer {
  readonly sourceType = Array;
  readonly targetType = Uint8Array;

  coerce(value: any[], path: JsonPath, { options }: CoercerContext): CoerceResult {
    const testResult = Schema.testWithFastError(byteNumberArraySchema, value, options, path);

    if (!testResult.success) {
      return { success: false, error: SchemaError.couldNotCoerce(Uint8Array, Array, path, undefined, { inner: testResult.error }) };
    }

    return { success: true, value: Uint8Array.from(testResult.value) };
  }
}

export const uint8ArrayCoercer = new Uint8ArrayCoercer();
