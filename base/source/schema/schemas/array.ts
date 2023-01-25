/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import type { OneOrMany } from '#/types';
import { toArrayCopy } from '#/utils/array/array';
import { isDefined } from '#/utils/type-guards';
import { ArrayMaximumLengthConstraint } from '../array-constraints';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils';
import type { SchemaTestable } from '../schema';
import type { SchemaArrayConstraint } from '../types/schema-array-constraint';
import type { ValueSchema, ValueSchemaOptions } from '../types/types';
import { valueSchema } from '../types/types';

export type ArrayOptions = ValueSchemaOptions & {
  /** minimum array length */
  minimumLength?: number,

  /** maximum array length */
  maximumLength?: number
};

export function array<T>(innerValues: OneOrMany<SchemaTestable<T>>, options: ArrayOptions = {}): ValueSchema<T[]> {
  const arrayConstraints: SchemaArrayConstraint[] = toArrayCopy(options.arrayConstraints ?? []);

  if (isDefined(options.minimumLength)) {
    arrayConstraints.push(new ArrayMaximumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    arrayConstraints.push(new ArrayMaximumLengthConstraint(options.maximumLength));
  }

  return valueSchema<any>(innerValues, {
    ...options,
    array: true,
    arrayConstraints
  });
}

export function Array(innerValues: OneOrMany<SchemaTestable>, options?: ArrayOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(array(innerValues, options));
}
