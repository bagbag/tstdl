/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany } from '#/types';
import { toArray } from '#/utils/array';
import type { SchemaTestable } from '../schema';
import type { Coercible, ValueSchema } from '../types';
import { array } from './array';
import { union } from './union';

export type OneOrManyOptions = Coercible & {
  /** minimum array length */
  minimumLength?: number,

  /** maximum array length */
  maximumLength?: number
};

export function oneOrMany<T, O = T>(innerValues: OneOrMany<SchemaTestable<T, O>>, options: OneOrManyOptions = {}): ValueSchema<T, O | O[]> {
  return union(array(innerValues, options), ...toArray(innerValues)) as ValueSchema<T, O | O[]>;
}
