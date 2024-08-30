import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestResult } from '../schema.js';

export class UnknownSchema extends Schema<unknown> {
  override readonly name = 'unknown';

  override _test(value: unknown): SchemaTestResult<unknown> {
    return { valid: true, value };
  }
}

export function unknown(): UnknownSchema {
  return new UnknownSchema();
}

export function Unknown(options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(unknown(), options);
}
