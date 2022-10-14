/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { AbstractConstructor, OneOrMany } from '#/types';
import { createSchemaValueTransformerDecorator } from '../decorators';
import type { TransformResult, ValueType } from '../types';
import { SchemaValueTransformer } from '../types';

export type GenericTransformFunction<T, O> = (value: T) => TransformResult<O>;

export class GenericTransformer<T, O> extends SchemaValueTransformer<T, O> {
  readonly sourceType?: OneOrMany<ValueType<T>>;
  readonly transformFunction: GenericTransformFunction<T, O>;

  constructor(transformFunction: GenericTransformFunction<T, O>, sourceType?: OneOrMany<ValueType<T>>) {
    super();

    this.sourceType = sourceType;
    this.transformFunction = transformFunction;
  }

  transform(value: T): TransformResult<O> {
    return this.transformFunction(value);
  }
}

export function Transform<T, O>(transformFunction: GenericTransformFunction<T, O>, sourceType?: OneOrMany<AbstractConstructor<T>>): Decorator<'property' | 'accessor'> {
  return createSchemaValueTransformerDecorator(new GenericTransformer(transformFunction, sourceType));
}
