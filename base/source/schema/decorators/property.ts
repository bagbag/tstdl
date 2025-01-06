/* eslint-disable @typescript-eslint/naming-convention */

import type { SetRequired } from 'type-fest';

import type { Decorator } from '#/reflection/index.js';
import type { TypedOmit } from '#/types.js';
import { isDefined, isFunction } from '#/utils/type-guards.js';
import type { SchemaTestable } from '../schema.js';
import type { SchemaPropertyReflectionData, SchemaTestableProvider } from './types.js';
import { createSchemaPropertyDecorator } from './utils.js';

export type SchemaPropertyDecoratorOptions = SchemaPropertyReflectionData;
export type SchemaPropertyDecoratorOptionsWithRequiredSchema = SetRequired<SchemaPropertyReflectionData, 'schema'>;
export type SchemaPropertyDecoratorOptionsWithoutSchema = TypedOmit<SchemaPropertyReflectionData, 'schema'>;

export function Property(schema: SchemaTestable, options?: SchemaPropertyDecoratorOptionsWithoutSchema): Decorator<'property' | 'accessor'>;
export function Property(options: SchemaPropertyDecoratorOptionsWithRequiredSchema): Decorator<'property' | 'accessor'>;
export function Property(schemaOrOptions?: SchemaTestable | SchemaPropertyDecoratorOptions, optionsOrNothing?: SchemaPropertyDecoratorOptionsWithoutSchema): Decorator<'property' | 'accessor'> {
  if (isDefined(optionsOrNothing)) {
    return createSchemaPropertyDecorator({ ...optionsOrNothing, schema: () => schemaOrOptions as SchemaTestable });
  }

  if (isFunction(schemaOrOptions)) {
    return createSchemaPropertyDecorator({ schema: () => schemaOrOptions });
  }

  return createSchemaPropertyDecorator(schemaOrOptions);
}

export function PropertySchema(schemaProvider: SchemaTestableProvider, options?: SchemaPropertyDecoratorOptionsWithoutSchema): Decorator<'property' | 'accessor'>;
export function PropertySchema(options: SchemaPropertyDecoratorOptionsWithRequiredSchema): Decorator<'property' | 'accessor'>;
export function PropertySchema(schemaProviderOrOptions?: SchemaTestableProvider | SchemaPropertyDecoratorOptions, optionsOrNothing?: SchemaPropertyDecoratorOptionsWithoutSchema): Decorator<'property' | 'accessor'> {
  if (isDefined(optionsOrNothing)) {
    return createSchemaPropertyDecorator({ ...optionsOrNothing, schema: schemaProviderOrOptions as SchemaTestableProvider });
  }

  if (isFunction(schemaProviderOrOptions)) {
    return createSchemaPropertyDecorator({ schema: schemaProviderOrOptions });
  }

  return createSchemaPropertyDecorator(schemaProviderOrOptions);
}
