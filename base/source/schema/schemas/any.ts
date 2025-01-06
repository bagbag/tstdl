import { PropertySchema, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaOptions, type SchemaTestResult } from '../schema.js';

export type AnySchemaOptions = SchemaOptions<any>;

export class AnySchema extends Schema<any> {
  override readonly name = 'any';

  override _test(value: any): SchemaTestResult<any> {
    return { valid: true, value };
  }
}

export function any(options?: AnySchemaOptions): AnySchema {
  return new AnySchema(options);
}

export function Any(options?: AnySchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => any({ description: data.description, example: data.example, ...options }), options);
}
