/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { TypedOmit } from '#/types.js';
import { isDefined } from '#/utils/type-guards.js';
import type { SchemaTestable } from '../schema.js';
import { isSchemaTestable } from '../testable.js';
import type { SchemaPropertyReflectionData } from './types.js';
import { createSchemaPropertyDecorator } from './utils.js';

export type SchemaPropertyDecoratorOptions = TypedOmit<SchemaPropertyReflectionData, 'schema'>;

export function Property(schema?: SchemaTestable, options?: SchemaPropertyDecoratorOptions): Decorator<'property' | 'accessor'>;
export function Property(options?: SchemaPropertyDecoratorOptions): Decorator<'property' | 'accessor'>;
export function Property(schemaOrOptions?: SchemaTestable | SchemaPropertyDecoratorOptions, optionsOrNothing?: SchemaPropertyDecoratorOptions): Decorator<'property' | 'accessor'> {
  if (isDefined(optionsOrNothing)) {
    return createSchemaPropertyDecorator({ schema: schemaOrOptions as SchemaTestable, ...optionsOrNothing });
  }

  if (isSchemaTestable(schemaOrOptions)) {
    return createSchemaPropertyDecorator({ schema: schemaOrOptions });
  }

  return createSchemaPropertyDecorator(schemaOrOptions);
}
