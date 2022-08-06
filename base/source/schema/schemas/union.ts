import type { Decorator } from '#/reflection';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { MaybeDeferredValueTypes, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type UnionTypeHelper<T extends MaybeDeferredValueTypes> = T extends MaybeDeferredValueTypes<infer U> ? U : never;

export function union<T extends [MaybeDeferredValueTypes, ...MaybeDeferredValueTypes[]]>(...schemas: T): ValueSchema<UnionTypeHelper<T[number]>> {
  return valueSchema({
    type: schemas
  });
}

export function Union(...schemas: [MaybeDeferredValueTypes, ...MaybeDeferredValueTypes[]]): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(union(...schemas));
}
