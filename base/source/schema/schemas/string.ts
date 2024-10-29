import { isDefined, isRegExp, isString } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type StringSchemaOptions = SimpleSchemaOptions & {
  pattern?: RegExp | string,
  lowercase?: boolean
};

export class StringSchema extends SimpleSchema<string> {
  override readonly name: string = 'string';

  readonly pattern: RegExp | null;
  readonly lowercase: boolean;

  constructor(options?: StringSchemaOptions) {
    super('string', isString, options, {
      coercers: {
        number: (value) => ({ success: true, value: globalThis.String(value), valid: true }),
        boolean: (value) => ({ success: true, value: globalThis.String(value), valid: true }),
        bigint: (value) => ({ success: true, value: globalThis.String(value), valid: true })
      },
      constraints: [
        isDefined(options?.pattern) ? ((value) => this.pattern!.test(value) ? ({ success: true }) : ({ success: false, error: 'Value did not match pattern.' })) : null
      ]
    });

    this.pattern = isString(options?.pattern)
      ? RegExp(options.pattern, 'u')
      : isRegExp(options?.pattern)
        ? options.pattern
        : null;
  }
}

export function string(options?: StringSchemaOptions): StringSchema {
  return new StringSchema(options);
}

export function StringProperty(options?: SchemaPropertyDecoratorOptions & StringSchemaOptions): SchemaPropertyDecorator {
  return Property(string(options), options);
}
