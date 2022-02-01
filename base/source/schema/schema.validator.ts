import { JsonPath } from '#/json-path';
import type { PrimitiveType, PrimitiveTypeString } from '#/types';
import { isUndefined } from '#/utils/type-guards';
import { SchemaError } from './schema.error';
import type { Coercible, Maskable, Schema, SchemaInput, SchemaOutput } from './types';

export const test: unique symbol = Symbol('test');
export const testAsync: unique symbol = Symbol('testAsync');

type CoercerFunction<P extends PrimitiveTypeString, T> = (value: PrimitiveType<P>, path: string | JsonPath) => ValidationTestResult<T>;

export type CoercerMap<T> = { [P in PrimitiveTypeString]?: CoercerFunction<P, T> };

export type ValidationOptions = Coercible & Maskable;

export type DefinedValidationOptions = Required<ValidationOptions>;

export type ValidationTestResult<T> =
  | { valid: true, value: T, error?: undefined }
  | { valid: false, value?: undefined, error: SchemaError };

export type EnsureTypeOptions = Coercible;

export abstract class SchemaValidator<T extends Schema = Schema> {
  readonly schema: T;

  constructor(schema: T) {
    this.schema = schema;
  }

  is(value: any, options?: ValidationOptions): value is SchemaOutput<T> {
    const result = this.test(value as SchemaInput<T>, options);
    return result.valid;
  }

  async isAsync(value: SchemaInput<T>, options?: ValidationOptions): Promise<boolean> {
    const result = await this.testAsync(value, options);
    return result.valid;
  }

  parse(value: SchemaInput<T>, options?: ValidationOptions): SchemaOutput<T> {
    const result = this.test(value, options);

    if (result.valid) {
      return result.value;
    }

    throw result.error;
  }

  async parseAsync(value: SchemaInput<T>, options?: ValidationOptions): Promise<SchemaOutput<T>> {
    const result = await this.testAsync(value, options);

    if (result.valid) {
      return result.value;
    }

    throw result.error;
  }

  test(value: SchemaInput<T>, options?: ValidationOptions): ValidationTestResult<SchemaOutput<T>> {
    return this[test](value, convertOptions(options), new JsonPath());
  }

  async testAsync(value: SchemaInput<T>, options?: ValidationOptions): Promise<ValidationTestResult<SchemaOutput<T>>> {
    return this[testAsync](value, convertOptions(options), new JsonPath());
  }

  protected ensureType<U extends PrimitiveType>(type: PrimitiveTypeString<U>, value: unknown, path: JsonPath, options?: EnsureTypeOptions, coercers?: CoercerMap<U>): ValidationTestResult<U> {
    const valueType = typeof value;

    if (valueType == type) {
      return { valid: true, value: value as U };
    }

    const coercer: CoercerFunction<any, any> | undefined = (options?.coerce ?? false) ? coercers?.[valueType] : undefined;

    if (isUndefined(coercer)) {
      return { valid: false, error: SchemaError.expectedButGot(type, valueType, path) };
    }

    return coercer(value, path);
  }

  // eslint-disable-next-line @typescript-eslint/adjacent-overload-signatures, @typescript-eslint/require-await
  protected async [testAsync](value: SchemaInput<T>, options: DefinedValidationOptions, path: JsonPath): Promise<ValidationTestResult<SchemaOutput<T>>> {
    return this[test](value, options, path);
  }

  protected abstract [test](value: SchemaInput<T>, options: DefinedValidationOptions, path: JsonPath): ValidationTestResult<SchemaOutput<T>>;
}

function convertOptions(options?: ValidationOptions): DefinedValidationOptions {
  return {
    coerce: options?.coerce ?? false,
    mask: options?.mask ?? false
  };
}
