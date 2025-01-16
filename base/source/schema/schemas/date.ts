import { isValidDate } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type DateSchemaOptions = SimpleSchemaOptions<globalThis.Date> & {
  integer?: boolean
};

export class DateSchema extends SimpleSchema<globalThis.Date> {
  override readonly name = 'date';

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

export function DateProperty(options?: SchemaDecoratorOptions & DateSchemaOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => date({ description: data.description, example: data.example, ...options }), options);
}
