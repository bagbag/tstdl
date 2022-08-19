/* eslint-disable @typescript-eslint/naming-convention */

import type { OneOrMany } from '#/types';
import { isDefined } from '#/utils/type-guards';
import { ArrayMaximumLengthConstraint } from '../array-constraints';
import type { Schema } from '../schema';
import type { Coercible, SchemaArrayConstraint, ValueSchema } from '../types';
import { valueSchema } from '../types';

export type ArrayOptions = Coercible & {
  /** minimum length */
  minimumLength?: number,

  /** maximum length */
  maximumLength?: number
};

export function array<T, O = T>(innerValues: OneOrMany<Schema<T, O>>, options: ArrayOptions = {}): ValueSchema<T, O[]> {
  const arrayConstraints: SchemaArrayConstraint[] = [];

  if (isDefined(options.minimumLength)) {
    arrayConstraints.push(new ArrayMaximumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    arrayConstraints.push(new ArrayMaximumLengthConstraint(options.maximumLength));
  }

  return valueSchema<any>(innerValues, {
    array: true,
    coerce: options.coerce,
    arrayConstraints
  });
}
