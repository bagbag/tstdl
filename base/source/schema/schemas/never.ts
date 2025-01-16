import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import { typeOf } from '#/utils/type-of.js';
import { Schema, type SchemaOptions, type SchemaTestOptions, type SchemaTestResult } from '../schema.js';

export type NeverSchemaOptions = SchemaOptions<never>;

export class NeverSchema extends Schema<never> {
  override readonly name = 'never';

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<never> {
    return { valid: false, error: SchemaError.expectedButGot('never', typeOf(value), path, { fast: options.fastErrors }) };
  }
}

export function never(options?: NeverSchemaOptions): NeverSchema {
  return new NeverSchema(options);
}
