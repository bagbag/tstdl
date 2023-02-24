/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import type { OneOrMany } from '#/types.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import { ArrayMaximumLengthConstraint } from '../array-constraints/maximum-length.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils.js';
import type { SchemaTestable } from '../schema.js';
import type { SchemaArrayConstraint } from '../types/schema-array-constraint.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';

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
