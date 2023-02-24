import type { OneOrMany } from '#/types.js';
import type { SchemaTestable } from '../schema.js';
import type { ObjectSchema, SchemaArrayConstraint, SchemaFactoryFunction, SchemaValueCoercer, SchemaValueConstraint, SchemaValueTransformer, TypeSchema, ValueSchema, ValueType } from '../types/index.js';

export type SchemaTypeReflectionData = Partial<Pick<ObjectSchema, 'mask' | 'allowUnknownProperties'>> & {
  schema?: ObjectSchema | TypeSchema | ValueType,
  factory?: SchemaFactoryFunction<any>
};

export type SchemaPropertyReflectionData = {
  schema?: OneOrMany<SchemaTestable>,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,
  coerce?: boolean,
  coercers?: readonly SchemaValueCoercer[],
  transformers?: readonly SchemaValueTransformer[],
  arrayConstraints?: readonly SchemaArrayConstraint[],
  valueConstraints?: readonly SchemaValueConstraint[]
};

export type PropertyOptions = Partial<ValueSchema<any>>;
