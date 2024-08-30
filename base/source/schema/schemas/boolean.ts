import type { JsonPath } from '#/json-path/json-path.js';
import { SchemaError } from '#/schema/schema.error.js';
import { isBoolean, isString } from '#/utils/type-guards.js';
import { typeOf } from '#/utils/type-of.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import type { SchemaTestOptions, SchemaTestResult } from '../schema.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type BooleanSchemaOptions = SimpleSchemaOptions;

export class BooleanSchema extends SimpleSchema<boolean> {
  override readonly name = 'boolean';

  constructor(options?: BooleanSchemaOptions) {
    super('boolean', isBoolean, options, {
      coercers: {
        all: (value) => {
          const normalizedValue = isString(value) ? value.toLowerCase().trim() : value;

          switch (normalizedValue) {
            case 1:
            case 1n:
            case 'true':
            case '1':
            case 'yes':
              return { success: true, value: true, valid: true };

            case 0:
            case 0n:
            case 'false':
            case '0':
            case 'no':
              return { success: true, value: false, valid: true };

            default:
              return { success: false };
          }
        }
      }
    });
  }

  override _test(value: any, path: JsonPath, options: SchemaTestOptions): SchemaTestResult<boolean> {
    if (isBoolean(value)) {
      return { valid: true, value };
    }

    return { valid: false, error: SchemaError.expectedButGot('boolean', typeOf(value), path, { fast: options.fastErrors }) };
  }
}

export function boolean(options?: BooleanSchemaOptions): BooleanSchema {
  return new BooleanSchema(options);
}

export function BooleanProperty(options?: BooleanSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(boolean(options), options);
}
