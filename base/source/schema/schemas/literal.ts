import type { JsonPath } from '#/json-path/json-path.js';
import { isPrimitive } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { Schema, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export class LiteralSchema<const T> extends Schema<T> {
  override readonly name: string;
  readonly value: T;

  constructor(value: T) {
    super();

    this.value = value;
    this.name = `Literal[${String(value)}]`;
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

export function literal<const T>(value: T): LiteralSchema<T> {
  return new LiteralSchema(value);
}


export function Literal(value: any, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(literal(value), options);
}
