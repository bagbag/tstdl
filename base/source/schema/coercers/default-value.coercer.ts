import type { CoerceResult, ValueType } from '../types';
import { SchemaValueCoercer } from '../types';

export class DefaultValueCoercer extends SchemaValueCoercer {
  readonly defaultValue: any;
  readonly sourceType = 'undefined';
  readonly targetType: ValueType;

  constructor(defaultValue: any) {
    super();

    this.defaultValue = defaultValue;
  }

  coerce(): CoerceResult {
    return { success: true, value: this.defaultValue };
  }
}
