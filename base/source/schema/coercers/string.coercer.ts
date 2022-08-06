import type { JsonPath } from '#/json-path';
import { isDate, isValidDate } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

export class StringCoercer extends SchemaValueCoercer {
  readonly sourceType = [Number, Boolean, BigInt, Date];
  readonly targetType = String;

  coerce(value: number | boolean | bigint | Date, path: JsonPath): CoerceResult {
    if (isDate(value) && !isValidDate(value)) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, 'invalid date', path) };
    }

    return { success: true, value: value.toString() };
  }
}

export const stringCoercer = new StringCoercer();
