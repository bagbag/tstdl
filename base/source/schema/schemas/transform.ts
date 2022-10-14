import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import type { GenericTransformFunction } from '../transformers/generic';
import { GenericTransformer } from '../transformers/generic';
import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function transform<T, O>(schema: OneOrMany<SchemaTestable<T>>, transformFunction: GenericTransformFunction<T, O>, sourceType?: OneOrMany<ValueType<T>>): ValueSchema<O> {
  return valueSchema(schema, {
    transformers: new GenericTransformer(transformFunction, sourceType)
  }) as ValueSchema<any>;
}
