import type { JsonPath } from '#/json-path/json-path';
import { SchemaError } from '../schema.error';
import type { CoercerContext, CoerceResult } from '../types';
import { SchemaValueCoercer } from '../types';

export class RegExpCoercer extends SchemaValueCoercer {
  readonly sourceType = String;
  readonly targetType = RegExp;
  readonly flags: string | undefined;

  constructor(flags: string = 'u') {
    super();

    this.flags = flags;
  }

  coerce(value: string, path: JsonPath, context: CoercerContext): CoerceResult {
    try {
      return { success: true, value: RegExp(value, this.flags) };
    }
    catch (error) {
      return { success: false, error: SchemaError.couldNotCoerce(this.targetType, 'invalid regexp pattern', path, { fast: context.options.fastErrors, customMessage: (error as Error).message }) };
    }
  }
}

export const regExpCoercer = new RegExpCoercer();
