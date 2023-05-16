import type { JsonPath } from '#/json-path/json-path.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { SchemaError } from '../schema.error.js';
import type { Schema } from '../schema.js';
import { testSchema } from '../schema.js';
import { array } from '../schemas/array.js';
import { number } from '../schemas/number.js';
import type { CoerceResult, CoercerContext } from '../types/index.js';
import { SchemaValueCoercer } from '../types/index.js';

export class Uint8ArrayCoercer extends SchemaValueCoercer {
  static readonly byteNumberArraySchema: Schema<number[]>;

  static {
    lazyProperty(this, 'byteNumberArraySchema', () => array(number({ integer: true, minimum: 0, maximum: 255 })));
  }

  readonly sourceType = Array;
  readonly targetType = Uint8Array;

  coerce(value: any[], path: JsonPath, { options }: CoercerContext): CoerceResult {
    const testResult = testSchema(Uint8ArrayCoercer.byteNumberArraySchema, value, options, path);

    if (!testResult.valid) {
      return { success: false, error: SchemaError.couldNotCoerce(Uint8Array, Array, path, { inner: testResult.error, fast: options.fastErrors }) };
    }

    return { success: true, value: Uint8Array.from(testResult.value) };
  }
}

export const uint8ArrayCoercer = new Uint8ArrayCoercer();
