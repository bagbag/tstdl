import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import type { TypedOmit } from '#/types.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { isArray, isNotNull } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { PropertySchema, type SchemaDecoratorOptions, type SchemaPropertyDecorator } from '../decorators/index.js';
import { Schema, type SchemaOptions, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';
import type { Coercible } from '../types.js';

export type ArraySchemaOptions<T> = SchemaOptions<T[]> & Coercible & {
  minimum?: number,
  maximum?: number,
};

export class ArraySchema<T> extends Schema<T[]> {
  readonly #options: ArraySchemaOptions<T>;

  override readonly name: string;
  readonly itemSchema: Schema<T>;
  readonly minimum: number | null;
  readonly maximum: number | null;

  constructor(itemSchema: SchemaTestable<T>, options: ArraySchemaOptions<T> = {}) {
    super(options);

    this.#options = options;
    this.itemSchema = schemaTestableToSchema(itemSchema);
    this.minimum = options.minimum ?? null;
    this.maximum = options.maximum ?? null;

    lazyProperty(this, 'name', () => `Array[${this.itemSchema.name}]`);
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<T[]> {
    if (!isArray(value)) {
      if ((this.#options.coerce ?? options.coerce) == true) {
        return this._test([value], path, options);
      }

      return { valid: false, error: SchemaError.expectedButGot('array', typeOf(value), path) };
    }

    if (isNotNull(this.maximum) && (value.length > this.maximum)) {
      throw new Error(`A maximum of ${this.maximum} items are allowed.`);
    }

    if (isNotNull(this.minimum) && (value.length < this.minimum)) {
      throw new Error(`A minimum of ${this.minimum} items are required.`);
    }

    const values: T[] = [];

    for (let i = 0; i < value.length; i++) {
      const result = this.itemSchema._test(value[i], path.add(i), options);

      if (!result.valid) {
        return result;
      }

      values.push(result.value);
    }

    return { valid: true, value: values };
  }
}

export function array<T>(schema: SchemaTestable<T>, options?: ArraySchemaOptions<T>): ArraySchema<T> {
  return new ArraySchema(schema, options);
}

export function Array(schema: SchemaTestable, options?: ArraySchemaOptions<unknown> & TypedOmit<SchemaDecoratorOptions, 'array'>): SchemaPropertyDecorator {
  return PropertySchema((data) => array(schema, { description: data.description, example: data.example, ...options }), options);
}
