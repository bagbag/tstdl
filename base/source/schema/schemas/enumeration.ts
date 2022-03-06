import type { JsonPath } from '#/json-path';
import type { StringMap } from '#/types';
import type { EnumValue } from '#/utils/enum';
import { enumValues } from '#/utils/enum';
import { lazyProperty } from '#/utils/object/lazy-property';
import { numberPattern } from '#/utils/patterns';
import { isArray, isNumber, isString } from '#/utils/type-guards';
import { typeOf } from '#/utils/type-of';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

type EnumerationArray = readonly [string | number, ...(string | number)[]];

type EnumerationObject = StringMap<string | number>;

type Enumeration = EnumerationArray | EnumerationObject;

type EnumerationSchemaOutput<T extends Enumeration> = T extends EnumerationArray ? T[number] : EnumValue<T>;

export type EnumerationSchemaDefinition<T extends Enumeration = Enumeration> = SchemaDefinition<'enumeration', unknown, EnumerationSchemaOutput<T>> & Coercible & {
  values: T
};

export class EnumerationSchemaValidator<T extends Enumeration> extends SchemaValidator<EnumerationSchemaDefinition<T>> {
  private readonly values: readonly (string | number)[];
  private readonly valuesSet: Set<string | number>;

  readonly valuesCommaSeparated: string;

  constructor(valuesOrEnum: T, schema: EnumerationSchemaDefinition<T>) {
    super(schema);

    this.values = isArray(valuesOrEnum) ? valuesOrEnum as EnumerationArray : enumValues(valuesOrEnum);
    this.valuesSet = new Set(this.values);

    lazyProperty(this as EnumerationSchemaValidator<T>, 'valuesCommaSeparated', () => this.values.map((value) => (stringifyEnumerationValue(value))).join(', '));
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<EnumerationSchemaDefinition<T>>> {
    if (this.valuesSet.has(value as string | number)) {
      return { valid: true, value: value as EnumerationSchemaOutput<T> };
    }

    if (this.schema.coerce ?? options.coerce) {
      let coercedValue: string | number | undefined;

      switch (typeof value) {
        case 'number':
          coercedValue = value.toString();
          break;

        case 'string':
          coercedValue = numberPattern.test(value) ? Number(value) : undefined;
          break;

        default:
          coercedValue = undefined;
          break;
      }

      if (this.valuesSet.has(coercedValue!)) {
        return { valid: true, value: coercedValue as EnumerationSchemaOutput<T> };
      }
    }

    return { valid: false, error: SchemaError.expectedButGot(`one of [${this.valuesCommaSeparated}]`, stringifyEnumerationValue(value), path) };
  }
}

export function enumeration<T extends Enumeration>(values: T, options?: SchemaOptions<EnumerationSchemaDefinition, 'values'>): EnumerationSchemaValidator<T> {
  const schema = schemaHelper<EnumerationSchemaDefinition<T>>({
    type: 'enumeration',
    values,
    ...options
  });

  return new EnumerationSchemaValidator(values, schema);
}

function stringifyEnumerationValue(value: any): string {
  return isString(value) ? `"${value}"`
    : isNumber(value) ? value.toString()
      : typeOf(value);
}
