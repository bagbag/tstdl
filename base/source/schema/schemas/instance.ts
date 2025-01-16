import type { JsonPath } from '#/json-path/json-path.js';
import type { AbstractConstructor } from '#/types.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { typeOf } from '#/utils/type-of.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { Schema, type SchemaOptions, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export type InstanceSchemaOptions<T extends AbstractConstructor> = SchemaOptions<InstanceType<T>>;

export class InstanceSchema<T extends AbstractConstructor> extends Schema<InstanceType<T>> {
  override readonly name: string;
  readonly type: T;

  constructor(type: T, options?: InstanceSchemaOptions<T>) {
    super(options);

    this.type = type;

    lazyProperty(this, 'name', () => `Instance[${type.name}]`);
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

export function instance<T extends AbstractConstructor>(type: T, options?: InstanceSchemaOptions<T>): InstanceSchema<T> {
  return new InstanceSchema(type, options);
}

export function Instance<T extends AbstractConstructor>(type: T, options?: InstanceSchemaOptions<T> & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => instance(type, { description: data.description, example: data.example, ...options }), options);
}
