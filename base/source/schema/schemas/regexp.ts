import { isRegExp } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SchemaError } from '../schema.error.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type RegExpSchemaOptions = SimpleSchemaOptions<RegExp>;

export class RegExpSchema extends SimpleSchema<RegExp> {
  override readonly name = 'RegExp';

  constructor(options?: RegExpSchemaOptions) {
    super('RegExp', isRegExp, options, {
      coercers: {
        string: (value, path, options) => {
          try {
            const regex = globalThis.RegExp(value, 'u');
            return ({ success: true, value: regex, valid: true });
          }
          catch (error) {
            return { success: false, error: SchemaError.couldNotCoerce(globalThis.RegExp, 'string', path, { fast: options.fastErrors, customMessage: (error as Error).message }) };
          }
        }
      }
    });
  }
}

export function regExp(options?: RegExpSchemaOptions): RegExpSchema {
  return new RegExpSchema(options);
}

export function RegExpProperty(options?: SchemaPropertyDecoratorOptions & RegExpSchemaOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => regExp({ description: data.description, example: data.example, ...options }), options);
}
