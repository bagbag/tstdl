/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany } from '#/types';
import { toArray } from '#/utils/array';
import type { SchemaTestable } from '../schema';
import type { ValueSchema, ValueSchemaOptions } from '../types';
import { array, ArrayOptions } from './array';
import { union } from './union';

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
