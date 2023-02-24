/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany } from '#/types.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils.js';
import type { SchemaTestable } from '../schema.js';
import type { ValueSchema } from '../types/index.js';
import { valueSchema } from '../types/index.js';
import { transform } from './transform.js';

export function defaulted<T, Default>(type: OneOrMany<SchemaTestable<T>>, defaultValue: Default): ValueSchema<NonNullable<T> | Default> {
  return transform(valueSchema(type, { optional: true, nullable: true }), (value: T) => value ?? defaultValue); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}

export function Defaulted(type: OneOrMany<SchemaTestable>, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(defaulted(type, defaultValue));
}
