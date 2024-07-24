import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaTestResult } from '../schema.js';

export class AnySchema extends Schema<any> {
  override _test(value: any): SchemaTestResult<any> {
    return { valid: true, value };
  }
}

export function any(): AnySchema {
  return new AnySchema();
}

export function Any(options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(any(), options);
}
