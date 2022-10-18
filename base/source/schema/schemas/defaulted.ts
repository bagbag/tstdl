/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils';
import type { SchemaTestable } from '../schema';
import type { ValueSchema } from '../types';
import { valueSchema } from '../types';
import { transform } from './transform';

export function defaulted<T, Default>(type: OneOrMany<SchemaTestable<T>>, defaultValue: Default): ValueSchema<NonNullable<T> | Default> {
  return transform(valueSchema(type, { optional: true, nullable: true }), (value: T) => value ?? defaultValue); // eslint-disable-line @typescript-eslint/no-unnecessary-condition
}

export function Defaulted(type: OneOrMany<SchemaTestable>, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(defaulted(type, defaultValue));
}
