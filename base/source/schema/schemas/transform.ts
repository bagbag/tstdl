import type { OneOrMany } from '#/types.js';
import type { SchemaTestable } from '../schema.js';
import type { GenericTransformFunction } from '../transformers/generic.js';
import { GenericTransformer } from '../transformers/generic.js';
import type { ValueSchema, ValueType } from '../types/index.js';
import { valueSchema } from '../types/index.js';

export function transform<T, O>(schema: OneOrMany<SchemaTestable<T>>, transformFunction: GenericTransformFunction<T, O>, sourceType?: OneOrMany<ValueType<T>>): ValueSchema<O> {
  return valueSchema(schema, {
    transformers: new GenericTransformer(transformFunction, sourceType)
  }) as ValueSchema<any>;
}
