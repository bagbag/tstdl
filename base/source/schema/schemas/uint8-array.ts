/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { toArray } from '#/utils/array/array';
import { isDefined } from '#/utils/type-guards';
import { uint8ArrayCoercer } from '../coercers/uint8-array.coercer';
import { MaximumLengthConstraint } from '../constraints/maximum-length';
import { MinimumLengthConstraint } from '../constraints/minimum-length';
import { createSchemaPropertyDecoratorFromSchema } from '../decorators/utils';
import type { SchemaValueCoercer, SchemaValueConstraint, ValueSchema, ValueSchemaOptions } from '../types';
import { typeSchema, valueSchema } from '../types';

export type Uint8ArraySchemaOptions = ValueSchemaOptions & {
  /** Minimum byte length */
  minimumLength?: number,

  /** Maximum byte length */
  maximumLength?: number
};

export function uint8Array(options: Uint8ArraySchemaOptions = {}): ValueSchema<globalThis.Uint8Array> {
  const coercers: SchemaValueCoercer[] = toArray(options.coercers ?? []);
  const valueConstraints: SchemaValueConstraint[] = toArray(options.valueConstraints ?? []);

  if (options.coerce == true) {
    coercers.push(uint8ArrayCoercer);
  }

  if (isDefined(options.minimumLength)) {
    valueConstraints.push(new MinimumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    valueConstraints.push(new MaximumLengthConstraint(options.maximumLength));
  }

  return valueSchema(typeSchema(globalThis.Uint8Array), {
    ...options,
    coercers,
    valueConstraints
  });
}

export function Uint8Array(options?: Uint8ArraySchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromSchema(uint8Array(options));
}
