import type { JsonPath } from '#/json-path/json-path.js';
import { isDate, isValidDate } from '#/utils/type-guards.js';
import { SchemaError } from '../schema.error.js';
import type { CoercerContext, CoerceResult } from '../types/index.js';
import { SchemaValueCoercer } from '../types/index.js';

export class StringCoercer extends SchemaValueCoercer {
  readonly sourceType = [Number, Boolean, BigInt, Date];
  readonly targetType = String;

  coerce(value: number | boolean | bigint | Date, path: JsonPath, context: CoercerContext): CoerceResult {
    if (isDate(value) && !isValidDate(value)) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, 'invalid date', path, { fast: context.options.fastErrors }) };
    }

    return { success: true, value: value.toString() };
  }
}

export const stringCoercer = new StringCoercer();
