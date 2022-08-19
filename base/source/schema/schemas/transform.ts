import type { AbstractConstructor, OneOrMany } from '#/types';
import type { Schema } from '../schema';
import type { GenericTransformFunction } from '../transformers/generic';
import { GenericTransformer } from '../transformers/generic';
import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function transform<T, O, TransformOutput>(schema: OneOrMany<Schema<T, O>>, sourceType: OneOrMany<ValueType<T>>, targetType: AbstractConstructor<TransformOutput>, transformFunction: GenericTransformFunction<O, TransformOutput>): ValueSchema<TransformOutput> {
  return valueSchema(schema, {
    transformers: new GenericTransformer(sourceType, targetType, transformFunction)
  }) as ValueSchema<any>;
}
