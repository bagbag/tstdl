import { JsonPath } from '#/json-path';
import type { Record } from '#/types';
import { toArray } from '#/utils/array/array';
import { noop } from '#/utils/noop';
import { objectKeys } from '#/utils/object/object';
import { differenceSets } from '#/utils/set';
import { isArray, isDefined, isFunction, isNotNull, isNull, isUndefined } from '#/utils/type-guards';
import { booleanCoercer } from './coercers/boolean.coercer';
import { dateCoercer } from './coercers/date.coercer';
import { numberCoercer } from './coercers/number.coercer';
import { regExpCoercer } from './coercers/regexp.coercer';
import { stringCoercer } from './coercers/string.coercer';
import { uint8ArrayCoercer } from './coercers/uint8-array.coercer';
import { SchemaError } from './schema.error';
import { isTypeSchema, isValueSchema, NormalizedObjectSchema, NormalizedTypeSchema, NormalizedValueSchema, ObjectSchema, ResolvedValueType, resolveValueType, SchemaContext, SchemaTestOptions, SchemaTestResult, SchemaValueCoercer, TypeSchema, valueSchema, ValueSchema, ValueType, valueTypeOrSchemaToSchema } from './types';
import { getArrayItemSchema, getSchemaFromReflection, getSchemaTypeNames, getValueType, getValueTypeName, normalizeObjectSchema, normalizeValueSchema } from './utils';

export type Schema<T = any, O = T> = ObjectSchema<T, O> | ValueSchema<T, O> | TypeSchema<O>;
export type SchemaTestable<T = any, O = T> = Schema<T, O> | ValueType<O>;
export type NormalizedSchema<T = any, O = T> = NormalizedObjectSchema<T, O> | NormalizedValueSchema<T, O> | NormalizedTypeSchema<O>;


const defaultCoercers = new Map<ValueType, SchemaValueCoercer[]>();

let initialize = (): void => {
  Schema.registerDefaultCoercer(numberCoercer);
  Schema.registerDefaultCoercer(stringCoercer);
  Schema.registerDefaultCoercer(booleanCoercer);
  Schema.registerDefaultCoercer(dateCoercer);
  Schema.registerDefaultCoercer(regExpCoercer);
  Schema.registerDefaultCoercer(uint8ArrayCoercer);

  initialize = noop;
};

// eslint-disable-next-line @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention
export const Schema = {
  registerDefaultCoercer(coercer: SchemaValueCoercer): void {
    for (const sourceType of toArray(coercer.sourceType)) {
      if (!defaultCoercers.has(sourceType)) {
        defaultCoercers.set(sourceType, []);
      }

      defaultCoercers.get(sourceType)!.push(coercer);
    }
  },

  test<T, O>(schemaOrValueType: SchemaTestable<T, O>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<O> {
    const schema = valueTypeOrSchemaToSchema(schemaOrValueType);
    const result = this.testWithFastError(schema, value, options, path);

    if (result.valid) {
      return result;
    }

    return { valid: false, error: new SchemaError(result.error.message, { ...result.error, fast: false }) };
  },

  validate<T, O = T>(schemaOrValueType: SchemaTestable<T, O>, value: unknown, options?: SchemaTestOptions): boolean {
    const schema = valueTypeOrSchemaToSchema(schemaOrValueType);
    const result = this.test(schema, value, options);

    return result.valid;
  },

  parse<T, O = T>(schemaOrValueType: SchemaTestable<T, O>, value: unknown, options?: SchemaTestOptions): O {
    const schema = valueTypeOrSchemaToSchema(schemaOrValueType);
    const result = this.test(schema, value, options);

    if (result.valid) {
      return result.value;
    }

    throw result.error;
  },

  /**
   * disables stack traces for errors
   * @deprecated for internal use only
   */
  testWithFastError<T, O = T>(schema: Schema<T, O>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<O> {
    initialize();

    if (isValueSchema(schema)) {
      return testValue(schema, value, options, path);
    }

    if (isTypeSchema(schema)) {
      return testType(schema, value, options, path);
    }

    return testObject(schema, value, options, path);
  }
};

function testType<T>(schema: TypeSchema<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  const resolvedValueType = resolveValueType(schema.type);

  if (resolvedValueType == 'any') {
    return { valid: true, value: value as T };
  }
  else if (isFunction(resolvedValueType)) {
    if ((value instanceof resolvedValueType) || (getValueType(value) == resolvedValueType)) {
      return { valid: true, value: value as T };
    }

    const objectSchema = getSchemaFromReflection(resolvedValueType);

    if (isNotNull(objectSchema)) {
      return testObject<T>(objectSchema, value, options, path);
    }
  }
  else if ((resolvedValueType == 'null' && isNull(value)) || (resolvedValueType == 'undefined' && isUndefined(value)) || (resolvedValueType == 'any')) {
    return { valid: true, value: value as T };
  }

  return { valid: false, error: SchemaError.expectedButGot(resolvedValueType, getValueType(value), path) };
}

// eslint-disable-next-line complexity
function testObject<T extends Record, O = T>(objectSchema: ObjectSchema<T, O>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<O> {
  if (!(value instanceof Object)) {
    return { valid: false, error: SchemaError.expectedButGot(objectSchema.sourceType ?? 'object', getValueType(value), path) };
  }

  const schema = normalizeObjectSchema(objectSchema as ObjectSchema);
  const mask = schema.mask ?? options.mask ?? false;
  const resultValue: O = isDefined(schema.factory?.type) ? new schema.factory!.type() : {} as Record;

  const schemaPropertyKeys = objectKeys(schema.properties);
  const valuePropertyKeys = objectKeys(value);

  const unknownValuePropertyKeys = differenceSets(new Set(valuePropertyKeys), new Set(schemaPropertyKeys));

  if ((unknownValuePropertyKeys.length > 0) && !(mask || (schema.allowUnknownProperties.size > 0))) {
    return { valid: false, error: new SchemaError('Unknown property', { path: path.add(unknownValuePropertyKeys[0]!) }) };
  }

  for (const key of schemaPropertyKeys) {
    const propertyResult = Schema.testWithFastError(schema.properties[key as string]!, (value as Record)[key], options, path.add(key));

    if (!propertyResult.valid) {
      return propertyResult;
    }

    resultValue[key as keyof O] = propertyResult.value;
  }

  if (schema.allowUnknownProperties.size > 0) {
    for (const key of unknownValuePropertyKeys) {
      const propertyResult = Schema.testWithFastError(valueSchema([...schema.allowUnknownProperties]), (value as Record)[key], options, path.add(key));

      if (!propertyResult.valid && !mask) {
        return propertyResult;
      }

      resultValue[key as keyof O] = propertyResult.value;
    }
  }

  const testResultValue = isUndefined(schema.factory) ? resultValue : isDefined(schema.factory.type) ? resultValue : schema.factory.builder!(resultValue);

  return { valid: true, value: testResultValue };
}

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
function testValue<T, O = T>(schema: ValueSchema<T, O>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<O> {
  const valueSchema = normalizeValueSchema(schema);

  if (valueSchema.optional && isUndefined(value)) {
    return { valid: true, value: value as unknown as O };
  }

  if (valueSchema.nullable && isNull(value)) {
    return { valid: true, value: value as unknown as O };
  }

  const context: SchemaContext = {
    schema: valueSchema,
    options
  };

  /** handle arrays */
  if (valueSchema.array) {
    if (!isArray(value)) {
      throw SchemaError.expectedButGot(Array, getValueType(value), path);
    }

    for (const arrayConstraint of valueSchema.arrayConstraints) {
      const result = arrayConstraint.validate(value, path, context);

      if (!result.valid) {
        return { valid: false, error: result.error };
      }
    }

    const itemSchema = getArrayItemSchema(schema);
    const validatedItems = [];

    for (let i = 0; i < value.length; i++) {
      const result = testValue(itemSchema, value[i], options, path.add(i));

      if (!result.valid) {
        return result;
      }

      validatedItems.push(result.value);
    }

    return { valid: true, value: validatedItems as unknown as O };
  }

  let valueType!: ResolvedValueType<any>;
  let valueTestResult!: SchemaTestResult<unknown>;
  let resultValue: unknown;

  function updateCurrentState(newValue: unknown): void {
    resultValue = newValue;
    valueType = getValueType(newValue);
    valueTestResult = isValidValue(valueSchema.schema, newValue, options, path);
  }

  updateCurrentState(value);

  /** try to coerce */
  if (!valueTestResult.valid) {
    const coercers = [
      ...(valueSchema.coercers.get(valueType) ?? []),
      ...((valueSchema.coerce || options.coerce == true) ? (defaultCoercers.get(valueType) ?? []) : [])
    ];

    const errors: SchemaError[] = [];
    let success = false;

    for (const coercer of coercers) {
      const coerceResult = coercer.coerce(resultValue, path, context);

      if (!coerceResult.success) {
        errors.push(coerceResult.error);
        continue;
      }

      success = true;
      updateCurrentState(coerceResult.value);
      break;
    }

    if (!success && (errors.length > 0)) {
      return { valid: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value could not be coerced.', { inner: errors, path }) };
    }
  }

  if (!valueTestResult.valid) {
    const expectsString = getExpectString(schema);
    return { valid: false, error: SchemaError.expectedButGot(expectsString, valueType, path) };
  }

  if (valueSchema.transformers.length > 0) {
    let transformedValue = resultValue;

    for (const transformer of valueSchema.transformers) {
      transformedValue = transformer.transform(transformedValue, path, context);
    }

    updateCurrentState(transformedValue);

    if (!valueTestResult.valid) { // eslint-disable-line @typescript-eslint/no-unnecessary-condition
      const typeString = getValueTypeName(valueType);
      throw new Error(`Transformers resulted in invalid type (${typeString}).`);
    }
  }

  {
    const errors: SchemaError[] = [];

    for (const constraint of valueSchema.valueConstraints) {
      const result = constraint.validate(resultValue, path, context);

      if (!result.valid) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return { valid: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value did not match schema.', { path, fast: true, inner: errors }) };
    }
  }

  return { valid: true, value: resultValue as O };
}

function isValidValue<T>(validSchemas: Iterable<Schema>, value: unknown, options: SchemaTestOptions | undefined, path: JsonPath): SchemaTestResult<T> {
  const errors: SchemaError[] = [];

  for (const schema of validSchemas) {
    const result = Schema.testWithFastError(schema, value, options, path);

    if (result.valid) {
      return result;
    }

    errors.push(result.error);
  }

  const expectStrings: string[] = [];

  for (const schema of validSchemas) {
    getExpectString(schema);
  }

  const expectString = expectStrings.join('\n');

  return { valid: false, error: SchemaError.expectedButGot(expectString, getValueType(value), path) };
}

function getExpectString(schema: Schema): string {
  const expectedNames = getSchemaTypeNames(schema);
  const expectedTypeString = (expectedNames.length == 1)
    ? expectedNames[0]!
    : `[${expectedNames.join(', ')}]`;

  const expects = isValueSchema(schema) ? toArray(schema.valueConstraints ?? []).map((constraint) => constraint.expects) : [];
  const expectsString = (expects.length > 0) ? ` (${expects.join(', ')})` : '';

  return `${expectedTypeString}${expectsString}`;
}
