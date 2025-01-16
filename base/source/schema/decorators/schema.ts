/* eslint-disable @typescript-eslint/naming-convention */

import type { SetRequired } from 'type-fest';

import { createDecorator, type Decorator } from '#/reflection/index.js';
import type { TypedOmit } from '#/types.js';
import { filterUndefinedObjectProperties } from '#/utils/object/object.js';
import type { SchemaTestable } from '../schema.js';
import { isSchemaTestable } from '../testable.js';
import type { CombinedSchemaDecorator, SchemaReflectionData, SchemaTestableProvider } from './types.js';

export type SchemaDecoratorOptions = SchemaReflectionData;
export type SchemaDecoratorOptionsWithRequiredSchema = SetRequired<SchemaReflectionData, 'schema'>;
export type SchemaDecoratorOptionsWithoutSchema = TypedOmit<SchemaReflectionData, 'schema'>;

export function createSchemaDecorator(data: SchemaReflectionData = {}): CombinedSchemaDecorator {
  return createDecorator({
    property: true,
    accessor: true,
    method: true,
    parameter: true,
    data: { schema: filterUndefinedObjectProperties(data) },
    mergeData: true
  });
}

export function SchemaDecorator(schema: SchemaTestable, options?: SchemaDecoratorOptionsWithoutSchema): CombinedSchemaDecorator;
export function SchemaDecorator(options: SchemaDecoratorOptionsWithRequiredSchema): CombinedSchemaDecorator;
export function SchemaDecorator(schemaOrOptions?: SchemaTestable | SchemaDecoratorOptionsWithRequiredSchema, optionsOrNothing?: SchemaDecoratorOptionsWithoutSchema): CombinedSchemaDecorator {
  if (isSchemaTestable(schemaOrOptions)) {
    return createSchemaDecorator({ ...optionsOrNothing, schema: () => schemaOrOptions });
  }

  return createSchemaDecorator(schemaOrOptions);
}

export function Parameter(name: string, schema: SchemaTestable, options?: SchemaDecoratorOptionsWithoutSchema): Decorator<'parameter'>;
export function Parameter(name: string, options: SchemaDecoratorOptions): Decorator<'parameter'>;
export function Parameter(name: string, schemaOrOptions?: SchemaTestable | SchemaDecoratorOptions, optionsOrNothing?: SchemaDecoratorOptions): Decorator<'parameter'> {
  if (isSchemaTestable(schemaOrOptions)) {
    return createSchemaDecorator({ ...optionsOrNothing, schema: () => schemaOrOptions, parameter: { name } });
  }

  return createSchemaDecorator({ ...schemaOrOptions, parameter: { name } });
}

export const Property = SchemaDecorator;

/**
 * @deprecated use @Property instead
 * @param schemaTestableProvider
 * @param options
 * @returns
 */
export function PropertySchema(schemaTestableProvider: SchemaTestableProvider, options?: SchemaDecoratorOptionsWithoutSchema): CombinedSchemaDecorator {
  return SchemaDecorator({ ...options, schema: schemaTestableProvider });
}
