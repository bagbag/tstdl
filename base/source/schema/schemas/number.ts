import { isNumber } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type NumberSchemaOptions = SimpleSchemaOptions & {
  integer?: boolean
};

export class NumberSchema extends SimpleSchema<number> {
  override readonly name = 'number';

  constructor(options?: NumberSchemaOptions) {
    super('number', isNumber, options, {
      coercers: {
        string: (value, path, options) => {
          const result = globalThis.Number(value);

          return globalThis.Number.isNaN(result)
            ? { success: false, error: SchemaError.couldNotCoerce('number', 'string', path, { fast: options.fastErrors }) }
            : { success: true, value: result, valid: true };
        },
        boolean: (value) => ({ success: true, value: globalThis.Number(value), valid: true }),
        bigint: (value) => ({ success: true, value: globalThis.Number(value), valid: false })
      },
      constraints: [
        (options?.integer == true) ? (value) => globalThis.Number.isInteger(value) ? ({ success: true }) : ({ success: false, error: 'value is not an integer.' }) : null
      ]
    });
  }
}

export function number(options?: NumberSchemaOptions): NumberSchema {
  return new NumberSchema(options);
}

export function NumberProperty(options?: SchemaPropertyDecoratorOptions & NumberSchemaOptions): SchemaPropertyDecorator {
  return Property(number(options), options);
}

export function Integer(options?: SchemaPropertyDecoratorOptions & NumberSchemaOptions): SchemaPropertyDecorator {
  return Property(number({ ...options, integer: true }), options);
}
