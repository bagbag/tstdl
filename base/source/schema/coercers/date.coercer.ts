import type { JsonPath } from '#/json-path/json-path.js';
import { isBigInt } from '#/utils/type-guards.js';
import { SchemaError } from '../schema.error.js';
import type { CoercerContext, CoerceResult } from '../types/index.js';
import { SchemaValueCoercer } from '../types/index.js';

export class DateCoercer extends SchemaValueCoercer {
  readonly sourceType = [Number, String, BigInt];
  readonly targetType = Date;

  coerce(value: number | string | bigint, path: JsonPath, context: CoercerContext): CoerceResult {
    const parseValue = isBigInt(value) ? Number(value) : value;
    const date = new Date(parseValue);

    if (Number.isNaN(date.getTime())) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, value.toString(), path, { fast: context.options.fastErrors }) };
    }

    return { success: true, value: date };
  }
}
export const dateCoercer = new DateCoercer();
