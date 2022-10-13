/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import { defaulted } from '../schemas/defaulted';
import { createSchemaPropertyDecoratorFromSchema } from './utils';

export function Defaulted(type: OneOrMany<SchemaTestable>, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(defaulted(type, defaultValue));
}
