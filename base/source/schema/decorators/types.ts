import type { OneOrMany } from '#/types';
import type { Schema } from '../schema';
import type { ObjectSchema, SchemaArrayConstraint, SchemaFactoryFunction, SchemaValueCoercer, SchemaValueConstraint, SchemaValueTransformer, ValueSchema, ValueType_FOO } from '../types';

export type SchemaTypeReflectionData = Partial<Pick<ObjectSchema, 'mask' | 'allowUnknownProperties'>> & {
  factory?: SchemaFactoryFunction<any>
};

export type TypesProvider = () => OneOrMany<Schema | ValueType_FOO>;

export type SchemaPropertyReflectionData = {
  type?: OneOrMany<Schema | ValueType_FOO>,
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
