import { isValidDate } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type DateSchemaOptions = SimpleSchemaOptions & {
  integer?: boolean
};

export class DateSchema extends SimpleSchema<globalThis.Date> {
  constructor(options?: DateSchemaOptions) {
    super('date', isValidDate, options, {
      coercers: {
        string: (value, path, options) => {
          const result = new globalThis.Date(value);

          return globalThis.Number.isNaN(result.getTime())
            ? { success: false, error: SchemaError.couldNotCoerce('date', 'string', path, { fast: options.fastErrors }) }
            : { success: true, value: result, valid: true };
        },
        number: (value) => ({ success: true, value: new globalThis.Date(value), valid: false })
      },
      constraints: [
        (options?.integer == true) ? (value) => globalThis.Number.isInteger(value) ? ({ success: true }) : ({ success: false, error: 'value is not an integer.' }) : null
      ]
    });
  }
}

export function date(options?: DateSchemaOptions): DateSchema {
  return new DateSchema(options);
}

export function DateProperty(options?: SchemaPropertyDecoratorOptions & DateSchemaOptions): SchemaPropertyDecorator {
  return Property(date(options), options);
}
