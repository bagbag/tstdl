import type { JsonPath } from '#/json-path/json-path';
import { IntegerConstraint } from '../constraints/integer';
import { MaximumConstraint } from '../constraints/maximum';
import { MinimumConstraint } from '../constraints/minimum';
import { Schema } from '../schema';
import { SchemaError } from '../schema.error';
import type { CoercerContext, CoerceResult, ValueSchema } from '../types';
import { SchemaValueCoercer } from '../types';

const byteNumberArraySchema: ValueSchema<number[]> = {
  type: Number,
  array: true,
  valueConstraints: [new MinimumConstraint(0), new MaximumConstraint(255), new IntegerConstraint()]
};

export class Uint8ArrayCoercer extends SchemaValueCoercer {
  readonly sourceType = Array;
  readonly targetType = Uint8Array;

  coerce(value: any[], path: JsonPath, { options }: CoercerContext): CoerceResult {
    const testResult = Schema.testWithFastError(byteNumberArraySchema, value, options, path);

    if (!testResult.success) {
      return { success: false, error: SchemaError.couldNotCoerce(Uint8Array, Array, path, undefined, { inner: testResult.error }) };
    }

    return { success: true, value: Uint8Array.from(testResult.value) };
  }
}

export const uint8ArrayCoercer = new Uint8ArrayCoercer();
