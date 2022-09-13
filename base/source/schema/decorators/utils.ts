/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator, PropertyMetadata } from '#/reflection';
import { createPropertyOrAccessorDecorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import { toArray } from '#/utils/array/array';
import { merge } from '#/utils/merge';
import { filterObject } from '#/utils/object';
import { isArray, isDefined, isUndefined } from '#/utils/type-guards';
import type { Schema } from '../schema';
import type { SchemaArrayConstraint, SchemaValueCoercer, SchemaValueConstraint, SchemaValueTransformer } from '../types';
import { isValueSchema, valueSchema } from '../types';
import type { PropertyOptions, SchemaPropertyReflectionData } from './types';

export function createSchemaPropertyDecorator(options: PropertyOptions): Decorator<'property' | 'accessor'> {
  return createPropertyOrAccessorDecorator({
    handler(_, metadata) {
      const schemaData = getOrCreateSchemaPropertyReflectionData(metadata);

      const newSchemaData: SchemaPropertyReflectionData = {
        ...options,
        coercers: (isDefined(options.coercers) && (!isArray(options.coercers) || options.coercers.length > 0)) ? merge(toArray(options.coercers), schemaData.coercers) : undefined,
        transformers: (isDefined(options.transformers) && (!isArray(options.transformers) || options.transformers.length > 0)) ? merge(toArray(options.transformers), schemaData.transformers) : undefined,
        arrayConstraints: (isDefined(options.arrayConstraints) && (!isArray(options.arrayConstraints) || options.arrayConstraints.length > 0)) ? merge(toArray(options.arrayConstraints), schemaData.arrayConstraints) : undefined,
        valueConstraints: (isDefined(options.valueConstraints) && (!isArray(options.valueConstraints) || options.valueConstraints.length > 0)) ? merge(toArray(options.valueConstraints), schemaData.valueConstraints) : undefined
      };

      metadata.data.set('schema', filterObject(newSchemaData, isDefined), true);
    }
  });
}

export function createSchemaPropertyDecoratorFromSchema(schema: Schema): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator(isValueSchema(schema) ? schema : valueSchema(schema));
}

export function createSchemaValueCoercerDecorator(coercer: SchemaValueCoercer, options?: PropertyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, coercers: coercer });
}

export function createSchemaValueTransformerDecorator(transformer: SchemaValueTransformer, options?: PropertyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, transformers: transformer });
}

export function createSchemaArrayConstraintDecorator(constraint: SchemaArrayConstraint, options?: PropertyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, arrayConstraints: constraint });
}

export function createSchemaValueConstraintDecorator(constraints: OneOrMany<SchemaValueConstraint>, options?: PropertyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecorator({ ...options, valueConstraints: constraints });
}

export function tryGetSchemaPropertyReflectionData(metadata: PropertyMetadata): SchemaPropertyReflectionData | undefined {
  return metadata.data.tryGet<SchemaPropertyReflectionData>('schema');
}

function getOrCreateSchemaPropertyReflectionData(metadata: PropertyMetadata): SchemaPropertyReflectionData {
  let schemaData = tryGetSchemaPropertyReflectionData(metadata);

  if (isUndefined(schemaData)) {
    schemaData = {};
    metadata.data.set('schema', schemaData);
  }

  return schemaData;
}
