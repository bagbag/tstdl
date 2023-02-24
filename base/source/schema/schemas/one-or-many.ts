/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany as OneOrManyType } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils.js';
import type { SchemaTestable } from '../schema.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import type { ArrayOptions } from './array.js';
import { array } from './array.js';
import { union } from './union.js';

export type OneOrMany<T> = OneOrManyType<T>;
export type OneOrManyOptions = ValueSchemaOptions & Pick<ArrayOptions, 'minimumLength' | 'maximumLength'>;

export function oneOrMany<T>(innerValues: OneOrMany<SchemaTestable<T>>, options?: OneOrManyOptions): ValueSchema<T | T[]> {
  return union(
    [
      array(innerValues, { minimumLength: options?.minimumLength, maximumLength: options?.maximumLength }),
      ...toArray(innerValues)
    ],
    options
  ) as ValueSchema<T | T[]>;
}

// eslint-disable-next-line @typescript-eslint/no-redeclare
export function OneOrMany(innerValues: OneOrMany<SchemaTestable>, options?: OneOrManyOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(oneOrMany(innerValues, options));
}
