/* eslint-disable @typescript-eslint/naming-convention */

import type { Decorator } from '#/reflection';
import { isDefined } from '#/utils/type-guards';
import { uint8ArrayCoercer } from '../coercers/uint8-array.coercer';
import { MaximumLengthConstraint } from '../constraints/maximum-length';
import { MinimumLengthConstraint } from '../constraints/minimum-length';
import { createSchemaPropertyDecoratorFromValueType } from '../decorators';
import type { Schema } from '../schema';
import type { Coercible, SchemaValueConstraint } from '../types';
import { valueSchema } from '../types';

export type Uint8ArraySchemaOptions = Coercible & {
  minimumLength?: number,
  maximumLength?: number
};

export function uint8Array(options: Uint8ArraySchemaOptions = {}): Schema<globalThis.Uint8Array> {
  const constraints: SchemaValueConstraint[] = [];

  if (isDefined(options.minimumLength)) {
    constraints.push(new MinimumLengthConstraint(options.minimumLength));
  }

  if (isDefined(options.maximumLength)) {
    constraints.push(new MaximumLengthConstraint(options.maximumLength));
  }

  return valueSchema(globalThis.Uint8Array, {
    coercers: (options.coerce == true) ? uint8ArrayCoercer : undefined,
    valueConstraints: constraints
  });
}

export function Uint8Array(options?: Uint8ArraySchemaOptions): Decorator<'property' | 'accessor'> {
  return createSchemaPropertyDecoratorFromValueType(uint8Array(options));
}
