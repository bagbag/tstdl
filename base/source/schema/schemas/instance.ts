import type { JsonPath } from '#/json-path/json-path.js';
import type { AbstractConstructor } from '#/types.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { Schema, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export class InstanceSchema<T extends AbstractConstructor> extends Schema<InstanceType<T>> {
  override readonly name: string;
  readonly type: T;

  constructor(type: T) {
    super();

    this.type = type;
    this.name = `Instance[${type.name}]`;
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<InstanceType<T>> {
    if (value instanceof (this.type as AbstractConstructor)) {
      return { valid: true, value };
    }

    return {
      valid: false,
      error: SchemaError.expectedButGot(
        typeOf(this.type),
        typeOf(value),
        path,
        { fast: options.fastErrors }
      )
    };
  }
}

export function instance<T extends AbstractConstructor>(type: T): InstanceSchema<T> {
  return new InstanceSchema(type);
}

export function Instance(type: AbstractConstructor, options?: SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(instance(type), options);
}
