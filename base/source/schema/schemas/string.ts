import { isDefined, isRegExp, isString } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type StringSchemaOptions = SimpleSchemaOptions & {
  pattern?: RegExp | string
};

export class StringSchema extends SimpleSchema<string> {
  override readonly name = 'string';

  constructor(options?: StringSchemaOptions) {
    const pattern = isDefined(options?.pattern) ? isString(options.pattern) ? RegExp(options.pattern, 'u') : isRegExp(options.pattern) ? options.pattern : undefined : undefined;

    super('string', isString, options, {
      coercers: {
        number: (value) => ({ success: true, value: globalThis.String(value), valid: true }),
        boolean: (value) => ({ success: true, value: globalThis.String(value), valid: true }),
        bigint: (value) => ({ success: true, value: globalThis.String(value), valid: true })
      },
      constraints: [
        isDefined(pattern) ? ((value) => pattern.test(value) ? ({ success: true }) : ({ success: false, error: 'Value did not match pattern.' })) : null
      ]
    });
  }
}

export function string(options?: StringSchemaOptions): StringSchema {
  return new StringSchema(options);
}

export function StringProperty(options?: SchemaPropertyDecoratorOptions & StringSchemaOptions): SchemaPropertyDecorator {
  return Property(string(options), options);
}
