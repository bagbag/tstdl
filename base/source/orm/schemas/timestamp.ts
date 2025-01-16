import type { JsonPath } from '#/json-path/json-path.js';
import { NumberSchema, type NumberSchemaOptions, Property, type SchemaPropertyDecorator, type SchemaDecoratorOptions, type SchemaTestOptions, type SchemaTestResult, type SimpleSchemaOptions } from '#/schema/index.js';
import { isDate } from '#/utils/type-guards.js';

export type TimestampSchemaOptions = SimpleSchemaOptions<number> & Pick<NumberSchemaOptions, 'minimum' | 'maximum'>;

export class TimestampSchema extends NumberSchema {
  override readonly name = 'Timestamp';

  constructor(options?: TimestampSchemaOptions) {
    super({ ...options, integer: true });
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<number> {
    if (isDate(value)) {
      return super._test(value.getTime(), path, options);
    }

    return super._test(value, path, options);
  }
}

export function timestamp(options?: TimestampSchemaOptions): TimestampSchema {
  return new TimestampSchema(options);
}

export function Timestamp(options?: TimestampSchemaOptions & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return Property(timestamp(options), options);
}
