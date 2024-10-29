import type { Decorator } from '#/reflection/types.js';
import type { SchemaTestable } from '../schema.js';
import type { ObjectSchemaFactoryFunction, ObjectSchemaOptions } from '../schemas/object.js';

export type SchemaPropertyDecorator = Decorator<'property' | 'accessor'>;

export type SchemaTypeReflectionData = Partial<Pick<ObjectSchemaOptions, 'mask' | 'unknownProperties' | 'unknownPropertiesKey'>> & {
  schema?: SchemaTestable,
  factory?: ObjectSchemaFactoryFunction<any>
};

export type SchemaPropertyReflectionData = {
  schema?: SchemaTestable,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,
  data?: Record<PropertyKey, any>
};
