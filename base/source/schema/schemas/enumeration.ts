import type { Enumeration as EnumerationType, EnumerationValue } from '#/types.js';
import { enumValues } from '#/utils/enum.js';
import { lazyProperty } from '#/utils/object/lazy-property.js';
import { isArray, isString } from '#/utils/type-guards.js';
import { PropertySchema, type SchemaPropertyDecorator, type SchemaDecoratorOptions } from '../decorators/index.js';
import { SimpleSchema, type SimpleSchemaOptions } from './simple.js';

export type EnumerationSchemaOptions<T extends EnumerationType> = SimpleSchemaOptions<EnumerationValue<T>>;

export class EnumerationSchema<const T extends EnumerationType> extends SimpleSchema<EnumerationValue<T>> {
  readonly #allowedValuesSet: Set<EnumerationValue>;

  override readonly name: string;
  readonly enumeration: EnumerationType;
  readonly allowedValues: readonly EnumerationValue<T>[];

  constructor(enumeration: T, options?: EnumerationSchemaOptions<T>) {
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

    this.allowedValues = allowedValues as EnumerationValue<T>[];
    this.#allowedValuesSet = new Set(allowedValues);

    lazyProperty(this, 'name', () => `Enumeration[${allowedValuesString}]`);
  }
}

export function enumeration<const T extends EnumerationType>(enumeration: T, options?: EnumerationSchemaOptions<T>): EnumerationSchema<T> {
  return new EnumerationSchema(enumeration, options);
}

export function Enumeration<const T extends EnumerationType>(enumeration: T, options?: EnumerationSchemaOptions<T> & SchemaDecoratorOptions): SchemaPropertyDecorator;
export function Enumeration<const T extends EnumerationType>(enums: T, options?: EnumerationSchemaOptions<T> & SchemaDecoratorOptions): SchemaPropertyDecorator {
  return PropertySchema((data) => enumeration(enums, { description: data.description, example: data.example, ...options }), options);
}
