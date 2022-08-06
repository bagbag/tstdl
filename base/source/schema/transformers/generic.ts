/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany, TypedOmit } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult, ValueType } from '../types';
import { SchemaValueTransformer } from '../types';

export type GenericTransformFunction<T> = (value: T) => TypedOmit<TransformResult, 'success'>;

export class GenericTransformer<T> extends SchemaValueTransformer {
  readonly sourceType: OneOrMany<ValueType>;
  readonly targetType: ValueType;
  readonly transformFunction: GenericTransformFunction<T>;

  constructor(sourceType: OneOrMany<ValueType>, targetType: ValueType, transformFunction: GenericTransformFunction<T>) {
    super();

    this.sourceType = sourceType;
    this.targetType = targetType;
    this.transformFunction = transformFunction;
  }

  transform(value: T): TransformResult {
    const result = this.transformFunction(value);

    if (isDefined(result.error)) {
      return { success: false, error: result.error };
    }

    return { success: true, value: result.value };
  }
}

export function Transform<T>(sourceType: OneOrMany<ValueType>, targetType: ValueType, transformFunction: GenericTransformFunction<T>): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new GenericTransformer(sourceType, targetType, transformFunction));
}
