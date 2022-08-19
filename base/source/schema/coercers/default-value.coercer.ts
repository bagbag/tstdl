import type { CoerceResult, ValueType_FOO } from '../types';
import { SchemaValueCoercer } from '../types';

export class DefaultValueCoercer extends SchemaValueCoercer {
  readonly defaultValue: any;
  readonly sourceType = ['undefined', 'null'] as const;
  readonly targetType: ValueType_FOO;

  constructor(defaultValue: any) {
    super();

    this.defaultValue = defaultValue;
  }

  coerce(): CoerceResult {
    return { success: true, value: this.defaultValue };
  }
}
