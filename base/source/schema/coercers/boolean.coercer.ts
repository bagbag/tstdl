import type { JsonPath } from '#/json-path';
import { isString } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

export class BooleanCoercer extends SchemaValueCoercer {
  readonly sourceType = [Number, String, BigInt];
  readonly targetType = Boolean;

  coerce(value: number | string | bigint, path: JsonPath): CoerceResult {
    const normalizedValue = isString(value) ? value.toLowerCase() : value;

    switch (normalizedValue) {
      case 1:
      case 1n:
      case 'true':
      case '1':
      case 'yes':
        return { success: true, value: true };

      case 0:
      case 0n:
      case 'false':
      case '0':
      case 'no':
        return { success: true, value: false };

      default:
        return { success: false, error: SchemaError.couldNotCoerce(Boolean, value.toString(), path) };
    }
  }
}

export const booleanCoercer = new BooleanCoercer();
