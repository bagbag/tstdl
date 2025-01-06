import { isBigInt } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import type { SchemaPropertyDecorator } from '../decorators/types.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type BigIntSchemaOptions = SimpleSchemaOptions<bigint>;

export class BigIntSchema extends SimpleSchema<bigint> {
  override readonly name = 'bigint';

  constructor(options?: BigIntSchemaOptions) {
    super('bigint', isBigInt, options, {
      coercers: {
        number(value, path, coerceOptions) {
          try {
            const bigIntValue = BigInt(value);
            return { success: true, value: bigIntValue, valid: true };
          }
          catch (error) {
            return { success: false, error: SchemaError.couldNotCoerce('bigint', 'number', path, { fast: coerceOptions.fastErrors, customMessage: (error as Error).message }) };
          }
        },
        string(value, path, coerceOptions) {
          try {
            const bigIntValue = BigInt(value);
            return { success: true, value: bigIntValue, valid: true };
          }
          catch (error) {
            return { success: false, error: SchemaError.couldNotCoerce('bigint', 'string', path, { fast: coerceOptions.fastErrors, customMessage: (error as Error).message }) };
          }
        }
      }
    });
  }
}

export function bigint(options?: BigIntSchemaOptions): BigIntSchema {
  return new BigIntSchema(options);
}

export function BigIntProperty(options?: BigIntSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => bigint({ description: data.description, example: data.example, ...options }), options);
}
