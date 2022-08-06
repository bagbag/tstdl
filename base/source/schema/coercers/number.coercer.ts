import type { JsonPath } from '#/json-path';
import { SchemaError } from '../schema.error';
import type { CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

export class NumberCoercer extends SchemaValueCoercer {
  readonly sourceType = [String, BigInt, Boolean];
  readonly targetType = Number;

  coerce(value: string | bigint | boolean, path: JsonPath): CoerceResult {
    const result = Number(value);

    if (Number.isNaN(result)) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, value.toString(), path, 'Value is not a number.') };
    }

    return { success: true, value: result };
  }
}

export const numberCoercer = new NumberCoercer();
