/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany as OneOrManyType } from '#/types';
import type { SchemaTestable } from '../schema';
import type { OneOrManyOptions } from '../schemas/one-or-many';
import { oneOrMany } from '../schemas/one-or-many';
import { createSchemaPropertyDecoratorFromSchema } from './utils';

export type OneOrMany<T> = OneOrManyType<T>;

// eslint-disable-next-line @typescript-eslint/no-redeclare
export function OneOrMany(innerValues: OneOrMany<SchemaTestable>, options?: OneOrManyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(oneOrMany(innerValues, options));
}
