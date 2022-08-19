/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import type { Schema } from '../schema';
import type { ArrayOptions } from '../schemas/array';
import { array } from '../schemas/array';
import { createSchemaPropertyDecoratorFromSchema } from './utils';

export function Array(innerValues: OneOrMany<Schema>, options?: ArrayOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(array(innerValues, options));
}
