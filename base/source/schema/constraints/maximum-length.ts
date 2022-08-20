/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path';
import type { Decorator } from '#/reflection';
import { isArrayBuffer } from '#/utils/type-guards';
import { createSchemaValueConstraintDecorator } from '../decorators/utils';
import { SchemaError } from '../schema.error';
import type { ConstraintResult } from '../types';
import { SchemaValueConstraint } from '../types';

export class MaximumLengthConstraint extends SchemaValueConstraint {
  private readonly maximumLength: number;

  readonly suitableTypes = [String, Array, ArrayBuffer, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
  readonly expects: string;

  constructor(maximumLength: number) {
    super();

    this.maximumLength = maximumLength;
    this.expects = `a maximum length of ${this.maximumLength}`;
  }

  validate(value: string, path: JsonPath): ConstraintResult {
    const length = isArrayBuffer(value) ? value.byteLength : value.length;

    if (length > this.maximumLength) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `a length of ${length}`, path) };
    }

    return { valid: true };
  }
}

export function MaximumLength(maximumLength: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumLengthConstraint(maximumLength));
}
