import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany } from '#/types';
import type { CoercerContext, CoerceResult, ValueType } from './types';

export abstract class SchemaValueCoercer {
  abstract readonly sourceType: OneOrMany<ValueType>;
  abstract readonly targetType: ValueType;

  abstract coerce(value: unknown, path: JsonPath, context: CoercerContext): CoerceResult;
}
