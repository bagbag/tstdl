import type { JsonPath } from '#/json-path/json-path.js';
import type { OneOrMany } from '#/types.js';
import type { TransformerContext, TransformResult, ValueType } from './types.js';

export abstract class SchemaValueTransformer<T = any, O = any> {
  abstract readonly sourceType?: OneOrMany<ValueType<T>>;

  abstract transform(value: T, path: JsonPath, context: TransformerContext): TransformResult<O>;
}
