import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { Schema, type SchemaOptions, type SchemaTestResult } from '../schema.js';

export type UnknownSchemaOptions = SchemaOptions<unknown>;

export class UnknownSchema extends Schema<unknown> {
  override readonly name = 'unknown';

  override _test(value: unknown): SchemaTestResult<unknown> {
    return { valid: true, value };
  }
}

export function unknown(options?: UnknownSchemaOptions): UnknownSchema {
  return new UnknownSchema(options);
}

export function Unknown(options?: UnknownSchemaOptions & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => unknown({ description: data.description, example: data.example, ...options }), options);
}
