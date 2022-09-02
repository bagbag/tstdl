/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { isArrayBuffer } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import type { ConstraintContext, ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

export class MinimumLengthConstraint extends SchemaValueConstraint {
  private readonly minimumLength: number;

  readonly suitableTypes = [String, Array, ArrayBuffer, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
  readonly expects: string;

  constructor(minimumLength: number) {
    super();

    this.minimumLength = minimumLength;
    this.expects = `a minimum length of ${this.minimumLength}`;
  }

  validate(value: string | ArrayLike<any> | ArrayBuffer, path: JsonPath, context: ConstraintContext): ConstraintResult {
    const length = isArrayBuffer(value) ? value.byteLength : value.length;

    if (length < this.minimumLength) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `a length of ${length}`, path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function MinimumLength(minimumLength: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MinimumLengthConstraint(minimumLength));
}
