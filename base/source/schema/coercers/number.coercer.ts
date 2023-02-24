import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '../schema.error.js';
import type { CoercerContext, CoerceResult } from '../types/index.js';
import { SchemaValueCoercer } from '../types/index.js';

export class NumberCoercer extends SchemaValueCoercer {
  readonly sourceType = [String, BigInt, Boolean];
  readonly targetType = Number;

  coerce(value: string | bigint | boolean, path: JsonPath, context: CoercerContext): CoerceResult {
    const result = Number(value);

    if (Number.isNaN(result)) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, value.toString(), path, { fast: context.options.fastErrors, customMessage: 'Value is not a number.' }) };
    }

    return { success: true, value: result };
  }
}

export const numberCoercer = new NumberCoercer();
