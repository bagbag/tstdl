import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany } from '#/types';
import type { TransformerContext, TransformResult, ValueType } from './types';

export abstract class SchemaValueTransformer<T = any, O = any> {
  abstract readonly sourceType?: OneOrMany<ValueType<T>>;

  abstract transform(value: T, path: JsonPath, context: TransformerContext): TransformResult<O>;
}
