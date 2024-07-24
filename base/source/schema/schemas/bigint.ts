import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import { isBigInt } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import type { SchemaPropertyDecorator } from '../decorators/types.js';
import { Schema, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export class BigIntSchema extends Schema<bigint> {
  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<bigint> {
    if (isBigInt(value)) {
      return { valid: true, value };
    }

    return { valid: false, error: SchemaError.expectedButGot('bigint', typeOf(value), path, { fast: options.fastErrors }) };
  }
}

export function bigint(): BigIntSchema {
  return new BigIntSchema();
}

export function BigIntProperty(options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(bigint(), options);
}
