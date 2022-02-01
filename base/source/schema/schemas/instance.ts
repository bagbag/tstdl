import type { JsonPath } from '#/json-path';
import type { Type } from '#/types';
import { isNull } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Schema, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

export type InstanceSchema<T = unknown> = Schema<'instance', T, T> & {
  constructor: Type<T>
};

export class InstanceSchemaValidator<T> extends SchemaValidator<InstanceSchema<T>> {
  [test](value: unknown, _options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<InstanceSchema<T>>> {
    if (value instanceof this.schema.constructor) {
      return { valid: true, value: value as T };
    }

    const type = typeof value;

    const got = type == 'object'
      ? isNull(value)
        ? 'null'
        : (value as object).constructor.name
      : type;

    return { valid: false, error: SchemaError.expectedButGot(`instance of ${this.schema.constructor.name}`, got, path) };
  }
}

export function instance<T>(constructor: Type<T>, options?: SchemaOptions<InstanceSchema<T>, 'constructor'>): InstanceSchemaValidator<T> {
  const schema = schemaHelper<InstanceSchema<T>>({
    type: 'instance',
    constructor,
    ...options
  });

  return new InstanceSchemaValidator(schema);
}
