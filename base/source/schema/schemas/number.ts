import type { TypedOmit } from '#/types/index.js';
import { isNumber } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaDecoratorOptions, type SchemaPropertyDecorator } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type NumberSchemaOptions = SimpleSchemaOptions<number> & {
  integer?: boolean,
  minimum?: number,
  maximum?: number,
};

export class NumberSchema extends SimpleSchema<number> {
  override readonly name: string = 'number';

  readonly integer: boolean;
  readonly minimum: number | null;
  readonly maximum: number | null;

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
        bigint: (value) => ({ success: true, value: globalThis.Number(value), valid: false }),
      },
      constraints: [
        (options?.integer == true) ? (value) => globalThis.Number.isInteger(value) ? ({ success: true }) : ({ success: false, error: 'Value is not an integer.' }) : null,
        isNumber(options?.minimum) ? (value) => (value >= this.minimum!) ? ({ success: true }) : ({ success: false, error: `Value must be more than or equal to ${this.minimum}.` }) : null,
        isNumber(options?.maximum) ? (value) => (value <= this.maximum!) ? ({ success: true }) : ({ success: false, error: `Value must be less than or equal to ${this.maximum}.` }) : null,
      ],
    });

    this.integer = options?.integer ?? false;
    this.minimum = options?.minimum ?? null;
    this.maximum = options?.maximum ?? null;
  }
}

export function number(options?: NumberSchemaOptions): NumberSchema {
  return new NumberSchema(options);
}

export function integer(options?: TypedOmit<NumberSchemaOptions, 'integer'>): NumberSchema {
  return number({ ...options, integer: true });
}

export function NumberProperty(options?: SchemaDecoratorOptions & NumberSchemaOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => number({ description: data.description, example: data.example, ...options }), options);
}

export function Integer(options?: SchemaDecoratorOptions & TypedOmit<NumberSchemaOptions, 'integer'>): SchemaPropertyDecorator {
  return PropertySchema((data) => number({ description: data.description, example: data.example, ...options, integer: true }), options);
}
