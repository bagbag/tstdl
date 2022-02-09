import type { JsonPath } from '#/json-path';
import { isDefined, isRegExp } from '#/utils/type-guards';
import { schemaError } from '../schema.error';
import type { CoercerMap, DefinedValidationOptions, ValidationTestResult } from '../schema.validator';
import { SchemaValidator, test } from '../schema.validator';
import type { Coercible, SchemaDefinition, SchemaOptions } from '../types';
import { schemaHelper } from '../types';

const coercerMap: CoercerMap<string> = {
  number: (number) => ({ valid: true, value: number.toString() }),
  boolean: (boolean) => ({ valid: true, value: boolean.toString() }),
  bigint: (bigint) => ({ valid: true, value: bigint.toString() })
};

export type StringSchemaDefinition = SchemaDefinition<'string', unknown, string> & Coercible & {
  /** trim */
  trim?: boolean,

  /** lowercase */
  lowercase?: boolean,

  /** uppercase */
  uppercase?: boolean,

  /** minimum length */
  min?: number,

  /** maximum length */
  max?: number,

  /** regular expression */
  pattern?: string | RegExp,

  /** regular expression flags */
  patternFlags?: string
};

export class StringSchemaValidator extends SchemaValidator<StringSchemaDefinition> {
  private readonly regexp: RegExp | undefined;

  constructor(schema: StringSchemaDefinition) {
    const pattern = isRegExp(schema.pattern) ? schema.pattern.source : schema.pattern;
    const patternFlags = isRegExp(schema.pattern) ? (schema.patternFlags ?? schema.pattern.flags) : schema.patternFlags;

    super({ ...schema, pattern, patternFlags });

    this.regexp = isDefined(pattern) ? RegExp(pattern, patternFlags) : undefined;
  }

  [test](value: unknown, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<string> {
    const result = super.ensureType('string', value, path, { coerce: this.schema.coerce ?? options.coerce }, coercerMap);

    if (!result.valid) {
      return result;
    }

    let resultValue = result.value;

    if (this.schema.trim == true) {
      resultValue = resultValue.trim();
    }

    if (this.schema.lowercase == true) {
      resultValue = resultValue.toLowerCase();
    }

    if (this.schema.uppercase == true) {
      resultValue = resultValue.toUpperCase();
    }

    if (isDefined(this.schema.min) && (resultValue.length < this.schema.min)) {
      return { valid: false, error: schemaError(`minimum length is ${this.schema.min} but value has ${resultValue.length}`, path) };
    }

    if (isDefined(this.schema.max) && (resultValue.length > this.schema.max)) {
      return { valid: false, error: schemaError(`maximum length is ${this.schema.max} but value has ${resultValue.length}`, path) };
    }

    if (isDefined(this.regexp) && !this.regexp.test(resultValue)) {
      return { valid: false, error: schemaError('pattern did not match', path) };
    }

    return { valid: true, value: resultValue };
  }
}

export function string(options?: SchemaOptions<StringSchemaDefinition>): StringSchemaValidator {
  const schema = schemaHelper<StringSchemaDefinition>({
    type: 'string',
    ...options
  });

  return new StringSchemaValidator(schema);
}
