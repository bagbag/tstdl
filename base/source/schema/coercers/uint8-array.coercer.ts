import type { JsonPath } from '#/json-path/json-path.js';
import { testSchema } from '../schema.js';
import { SchemaError } from '../schema.error.js';
import { array } from '../schemas/array.js';
import { number } from '../schemas/number.js';
import type { CoercerContext, CoerceResult } from '../types/index.js';
import { SchemaValueCoercer } from '../types/index.js';

const byteNumberArraySchema = array(number({ integer: true, minimum: 0, maximum: 255 }));

export class Uint8ArrayCoercer extends SchemaValueCoercer {
  readonly sourceType = Array;
  readonly targetType = Uint8Array;

  coerce(value: any[], path: JsonPath, { options }: CoercerContext): CoerceResult {
    const testResult = testSchema(byteNumberArraySchema, value, options, path);

    if (!testResult.valid) {
      return { success: false, error: SchemaError.couldNotCoerce(Uint8Array, Array, path, { inner: testResult.error, fast: options.fastErrors }) };
    }

    return { success: true, value: Uint8Array.from(testResult.value) };
  }
}

export const uint8ArrayCoercer = new Uint8ArrayCoercer();
