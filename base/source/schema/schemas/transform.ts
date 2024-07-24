import type { JsonPath } from '#/json-path/json-path.js';
import { Schema, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export class TransformSchema<I, O> extends Schema<O> {
  readonly schema: Schema<I>;
  readonly transformFn: (value: I) => O;

  constructor(schema: Schema<I>, transformFn: (value: I) => O) {
    super();

    this.schema = schema;
    this.transformFn = transformFn;
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
