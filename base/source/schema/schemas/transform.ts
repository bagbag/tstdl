import type { JsonPath } from '#/json-path/json-path.js';
import { Schema, type SchemaTestable, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';
import { schemaTestableToSchema } from '../testable.js';

export class TransformSchema<I, O> extends Schema<O> {
  override readonly name: string;

  readonly schema: Schema<I>;
  readonly transformFn: (value: I) => O;

  constructor(schema: SchemaTestable<I>, transformFn: (value: I) => O) {
    super();

    this.schema = schemaTestableToSchema(schema);
    this.transformFn = transformFn;

    this.name = `Transform[${schema.name}]`;
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<O> {
    const result = this.schema._test(value, path, options);

    if (!result.valid) {
      return result;
    }

    return { valid: true, value: this.transformFn(result.value) };
  }
}

export function transform<I, O>(schema: Schema<I>, transformFn: (value: I) => O): TransformSchema<I, O> {
  return new TransformSchema(schema, transformFn);
}
