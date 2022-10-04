/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { SchemaTestable } from '../schema';
import type { OneOrManyOptions } from '../schemas/one-or-many';
import { oneOrMany } from '../schemas/one-or-many';
import { createSchemaPropertyDecoratorFromSchema } from './utils';

export function OneOrMany(innerValues: OneOrMany<SchemaTestable>, options?: OneOrManyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(oneOrMany(innerValues, options));
}
