import type { OneOrMany } from '#/types';
import type { GenericTransformFunction } from '../transformers/generic';
import { GenericTransformer } from '../transformers/generic';
import type { MaybeDeferredValueTypes, ValueSchema, ValueType } from '../types';
import { valueSchema } from '../types';

export function transform<T>(schema: MaybeDeferredValueTypes<T>, sourceType: OneOrMany<ValueType>, targetType: ValueType, transformFunction: GenericTransformFunction<T>): ValueSchema<T> {
  return valueSchema({
    type: schema,
    transformers: new GenericTransformer(sourceType, targetType, transformFunction)
  });
}

/* decorator is in file of GenericTransformer */
