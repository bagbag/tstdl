import type { JsonPath } from '#/json-path';
import { lazyProperty } from '#/utils/object/lazy-property';
import { numberPattern } from '#/utils/patterns';
import { isString } from '#/utils/type-guards';
import { SchemaError } from '../schema.error';
import type { DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions, SchemaOutput } from '../types';
import { schemaHelper } from '../types';

type Enumeration = readonly [string | number, ...(string | number)[]];

export type EnumerationSchemaDefinition<T extends Enumeration = Enumeration> = SchemaDefinition<'enumeration', unknown, T[number]> & Coercible & {
  values: T
};

export class EnumerationSchemaValidator<T extends Enumeration> extends SchemaValidator<EnumerationSchemaDefinition<T>> {
  private readonly valuesSet: Set<string | number>;

  readonly valuesCommaSeparated: string;


  constructor(values: T, schema: EnumerationSchemaDefinition<T>) {
    super(schema);

    this.valuesSet = new Set(values);

    lazyProperty(this as EnumerationSchemaValidator<T>, 'valuesCommaSeparated', () => this.schema.values.map((value) => (stringifyEnumerationValue(value))).join(', '));
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<EnumerationSchemaDefinition<T>>> {
    if (this.valuesSet.has(value as T[number])) {
      return { valid: true, value: value as T[number] };
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
        return { valid: true, value: coercedValue as T[number] };
      }
    }

    return { valid: false, error: SchemaError.expectedButGot(`one of [${this.valuesCommaSeparated}]`, stringifyEnumerationValue(String(value)), path) };
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

function stringifyEnumerationValue(value: string | number): string {
  return isString(value) ? `"${value}"` : value.toString();
}
