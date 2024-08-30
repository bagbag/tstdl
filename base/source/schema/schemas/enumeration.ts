import type { Enumeration as EnumerationType, EnumerationValue } from '#/types.js';
import { enumValues } from '#/utils/enum.js';
import { isArray, isString } from '#/utils/type-guards.js';
import { Property, type SchemaPropertyDecorator, type SchemaPropertyDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type EnumerationSchemaOptions = SimpleSchemaOptions;

export class EnumerationSchema<T extends EnumerationType> extends SimpleSchema<EnumerationValue<T>> {
  readonly #allowedValuesSet: Set<EnumerationValue>;

  override readonly name: string;
  readonly enumeration: EnumerationType;

  constructor(enumeration: T, options?: EnumerationSchemaOptions) {
    const allowedValues = isArray(enumeration) ? enumeration : enumValues(enumeration);
    const allowedValuesString = allowedValues.map((value) => (isString(value) ? `"${value}"` : String(value))).join(', ');

    super(
      `one of [${allowedValuesString}]`,
      (value): value is EnumerationValue<T> => this.#allowedValuesSet.has(value),
      options,
      {
        coercers: {
          string: (value) => ({ success: true, value: Number(value) as EnumerationValue<T>, valid: false }),
          number: (value) => ({ success: true, value: String(value) as EnumerationValue<T>, valid: false })
        },
        gotValueFormatter: (value) => isString(value) ? `"${value}"` : String(value)
      }
    );

    this.enumeration = enumeration;

    this.#allowedValuesSet = new Set(allowedValues);
    this.name = `Enumeration[${allowedValuesString}]`;
  }
}

export function enumeration<T extends EnumerationType>(enumeration: T, options?: EnumerationSchemaOptions): EnumerationSchema<T> {
  return new EnumerationSchema(enumeration, options);
}

export function Enumeration(enumeration: EnumerationType, options?: EnumerationSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator;
export function Enumeration(enums: EnumerationType, options?: EnumerationSchemaOptions & SchemaPropertyDecoratorOptions): SchemaPropertyDecorator {
  return Property(enumeration(enums, options), options);
}
