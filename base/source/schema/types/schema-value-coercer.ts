import type { JsonPath } from '#/json-path/json-path.js';
import type { OneOrMany } from '#/types.js';
import type { CoercerContext, CoerceResult, ValueType } from './types.js';

export abstract class SchemaValueCoercer {
  abstract readonly sourceType: OneOrMany<ValueType>;
  abstract readonly targetType: ValueType;

  abstract coerce(value: unknown, path: JsonPath, context: CoercerContext): CoerceResult;
}
