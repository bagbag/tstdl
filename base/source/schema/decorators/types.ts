import type { OneOrMany } from '#/types';
import type { MaybeDeferredValueTypes, ObjectSchema, SchemaArrayConstraint, SchemaFactoryFunction, SchemaValueCoercer, SchemaValueConstraint, SchemaValueTransformer, ValueSchema, ValueType } from '../types';

export type SchemaTypeReflectionData = Partial<Pick<ObjectSchema, 'mask' | 'allowUnknownProperties'>> & {
  factory?: SchemaFactoryFunction<any>
};

export type TypesProvider = () => OneOrMany<ValueType>;

export type SchemaPropertyReflectionData = {
  type?: MaybeDeferredValueTypes,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,
  coerce?: boolean,
  coercers?: readonly SchemaValueCoercer[],
  transformers?: readonly SchemaValueTransformer[],
  arrayConstraints?: readonly SchemaArrayConstraint[],
  valueConstraints?: readonly SchemaValueConstraint[]
};

export type PropertyOptions = Partial<ValueSchema>;
