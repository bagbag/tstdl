import { isBoolean, isString } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaDecoratorOptions, type SchemaPropertyDecorator } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type BooleanSchemaOptions = SimpleSchemaOptions<boolean>;

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
        },
      },
    });
  }
}

export function boolean(options?: BooleanSchemaOptions): BooleanSchema {
  return new BooleanSchema(options);
}

export function BooleanProperty(options?: BooleanSchemaOptions & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => boolean({ description: data.description, example: data.example, ...options }), options);
}
