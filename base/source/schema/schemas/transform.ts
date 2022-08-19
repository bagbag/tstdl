import type { OneOrMany } from '#/types';
import type { GenericTransformFunction } from '../transformers/generic';
import { GenericTransformer } from '../transformers/generic';
import type { ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function transform<T, O, TransformOutput>(schema: OneOrMany<ValueType<T, O>>, sourceType: OneOrMany<ValueType<T, O>>, targetType: ValueType<TransformOutput>, transformFunction: GenericTransformFunction<O, TransformOutput>): ValueSchema<TransformOutput> {
  return valueSchema(schema, {
    transformers: new GenericTransformer(sourceType, targetType, transformFunction)
  }) as ValueSchema<any>;
}
