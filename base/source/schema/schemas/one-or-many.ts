/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany as OneOrManyType } from '#/types';
import { toArray } from '#/utils/array';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils';
import type { SchemaTestable } from '../schema';
import type { ValueSchema, ValueSchemaOptions } from '../types';
import type { ArrayOptions } from './array';
import { array } from './array';
import { union } from './union';

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
