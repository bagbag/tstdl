/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection/index.js';
import { toArrayCopy } from '#/utils/array/array.js';
import { isDefined } from '#/utils/type-guards.js';
import { uint8ArrayCoercer } from '../coercers/uint8-array.coercer.js';
import { MaximumLengthConstraint } from '../constraints/maximum-length.js';
import { MinimumLengthConstraint } from '../constraints/minimum-length.js';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils.js';
import type { SchemaValueCoercer } from '../types/schema-value-coercer.js';
import type { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ValueSchema, ValueSchemaOptions } from '../types/types.js';
import { valueSchema } from '../types/types.js';

export type Uint8ArraySchemaOptions = ValueSchemaOptions & {
  /** Minimum byte length */
  minimumLength?: number,

  /** Maximum byte length */
  maximumLength?: number
};

export function uint8Array(options: Uint8ArraySchemaOptions = {}): ValueSchema<Uint8Array> {
  const coercers: SchemaValueCoercer[] = toArrayCopy(options.coercers ?? []);
  const valueConstraints: SchemaValueConstraint[] = toArrayCopy(options.valueConstraints ?? []);

  if (options.coerce == true) {
    coercers.push(uint8ArrayCoercer);
  }

  if (isDefined(options.minimumLength)) {
    valueConstraints.push(new MinimumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    valueConstraints.push(new MaximumLengthConstraint(options.maximumLength));
  }

  return valueSchema(Uint8Array, {
    ...options,
    coercers,
    valueConstraints
  });
}

export function Uint8ArrayProperty(options?: Uint8ArraySchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(uint8Array(options));
}
