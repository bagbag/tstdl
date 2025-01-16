import type { Decorator } from '#/reflection/types.js';
import type { SchemaOptions, SchemaTestable } from '../schema.js';
import type { ObjectSchemaFactory, ObjectSchemaOptions } from '../schemas/object.js';

export type SchemaClassDecorator = Decorator<'class'>;
export type SchemaPropertyDecorator = Decorator<'property' | 'accessor'>;
export type SchemaMethodDecorator = Decorator<'method'>;
export type CombinedSchemaDecorator = Decorator<'property' | 'accessor' | 'parameter'>;

export type SchemaTypeReflectionData = Partial<Pick<ObjectSchemaOptions, 'mask' | 'unknownProperties' | 'unknownPropertiesKey' | 'description' | 'example'>> & {
  schema?: SchemaTestable,
  factory?: ObjectSchemaFactory<any>
};

export type SchemaTestableProvider = (data: SchemaReflectionData) => SchemaTestable;

export type SchemaReflectionData = Partial<Pick<SchemaOptions<any>, 'description' | 'example'>> & {
  schema?: SchemaTestableProvider,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,
  method?: {
    returnType?: SchemaTestableProvider
  },
  parameter?: {
    name?: string
  }
};
