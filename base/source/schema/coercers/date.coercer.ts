import type { JsonPath } from '#/json-path';
import { isBigInt } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

export class DateCoercer extends SchemaValueCoercer {
  readonly sourceType = [Number, String, BigInt];
  readonly targetType = Date;

  coerce(value: number | string | bigint, path: JsonPath): CoerceResult {
    const parseValue = isBigInt(value) ? Number(value) : value;
    const date = new Date(parseValue);

    if (Number.isNaN(date.getTime())) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, value.toString(), path) };
    }

    return { success: true, value: date };
  }
}
export const dateCoercer = new DateCoercer();
