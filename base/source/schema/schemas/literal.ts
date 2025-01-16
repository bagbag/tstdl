import type { JsonPath } from '#/json-path/json-path.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { isPrimitive } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { Schema, SchemaOptions, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export type LiteralSchemaOptions<T> = SchemaOptions<T>;


export class LiteralSchema<const T> extends Schema<T> {
  override readonly name: string;
  readonly value: T;

  constructor(value: T, options?: LiteralSchemaOptions<T>) {
    super(options);

    this.value = value;

    lazyProperty(this, 'name', () => `Literal[${String(value)}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T> {
    if (value === this.value) {
      return { valid: true, value };
    }

    return {
      valid: false,
      error: SchemaError.expectedButGot(
        isPrimitive(this.value) ? String(this.value) : typeOf(this.value),
        isPrimitive(value) ? String(value) : typeOf(value),
        path,
        { fast: options.fastErrors }
      )
    };
  }
}

export function literal<const T>(value: T, options?: LiteralSchemaOptions<T>): LiteralSchema<T> {
  return new LiteralSchema(value, options);
}


export function Literal<const T>(value: T, options?: LiteralSchemaOptions<T> & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => literal(value, { description: data.description, example: data.example, ...options }), options);
}
