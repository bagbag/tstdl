/* eslint-disable @typescript-eslint/naming-convention */

import type { JsonPath } from '#/json-path/json-path.js';
import type { Decorator } from '#/reflection/index.js';
import { isArrayBuffer, isArrayBufferView } from '#/utils/type-guards.js';
import { createSchemaValueConstraintDecorator } from '../decorators/utils.js';
import { SchemaError } from '../schema.error.js';
import { SchemaValueConstraint } from '../types/schema-value-constraint.js';
import type { ConstraintContext, ConstraintResult } from '../types/types.js';

export class MaximumLengthConstraint extends SchemaValueConstraint {
  private readonly maximumLength: number;

  readonly suitableTypes = [String, Array, ArrayBuffer, Int8Array, Uint8Array, Uint8ClampedArray, Int16Array, Uint16Array, Int32Array, Uint32Array, Float32Array, Float64Array, BigInt64Array, BigUint64Array];
  readonly expects: string;

  constructor(maximumLength: number) {
    super();

    this.maximumLength = maximumLength;
    this.expects = `a maximum length of ${this.maximumLength}`;
  }

  validate(value: string, path: JsonPath, context: ConstraintContext): ConstraintResult {
    const length = (isArrayBuffer(value) || isArrayBufferView(value)) ? value.byteLength : value.length;

    if (length > this.maximumLength) {
      return { valid: false, error: SchemaError.expectedButGot(this.expects, `a length of ${length}`, path, { fast: context.options.fastErrors }) };
    }

    return { valid: true };
  }
}

export function MaximumLength(maximumLength: number): Decorator<'property' | 'accessor'> {
  return createSchemaValueConstraintDecorator(new MaximumLengthConstraint(maximumLength));
}
