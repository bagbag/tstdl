/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { Schema } from '../schema';
import { defaulted } from '../schemas/defaulted';
import { createSchemaPropertyDecoratorFromSchema } from './utils';

export function Defaulted(type: OneOrMany<Schema>, defaultValue: any): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(defaulted(type, defaultValue));
}
