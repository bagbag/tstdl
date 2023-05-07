import { JsonPath } from '#/json-path/index.js';
import type { ObjectLiteral, Record } from '#/types.js';
import { toArray } from '#/utils/array/array.js';
import { noop } from '#/utils/noop.js';
import { objectKeys } from '#/utils/object/object.js';
import { differenceSets } from '#/utils/set.js';
import { isArray, isDefined, isFunction, isNotNull, isNull, isUndefined } from '#/utils/type-guards.js';
import { booleanCoercer, dateCoercer, numberCoercer, regExpCoercer, stringCoercer, uint8ArrayCoercer } from './coercers/index.js';
import { SchemaError } from './schema.error.js';
import type { NormalizedObjectSchema, NormalizedTypeSchema, NormalizedValueSchema, ObjectSchema, ResolvedValueType, SchemaContext, SchemaOutput, SchemaTestOptions, SchemaTestResult, SchemaValueCoercer, TransformResult, TupleSchemaOutput, TypeSchema, ValueSchema, ValueType } from './types/index.js';
import { isObjectSchema, isTransformErrorResult, isTypeSchema, isValueSchema, resolveValueType, resolveValueTypes, schemaTestableToSchema, transformErrorResultSymbol } from './types/index.js';
import { getArrayItemSchema, getSchemaTypeNames, getSchemaValueTypes, getValueType, includesValueType, normalizeObjectSchema, normalizeValueSchema, tryGetObjectSchemaFromReflection } from './utils/index.js';

export type Schema<T = any> = ObjectSchema<T> | ValueSchema<T> | TypeSchema<T>;
export type SchemaTestable<T = any> = Schema<T> | ValueType<T>;
export type NormalizedSchema<T = any> = NormalizedObjectSchema<T> | NormalizedValueSchema<T> | NormalizedTypeSchema<T>;


const defaultCoercers = new Map<ValueType, SchemaValueCoercer[]>();

let initialize = (): void => {
  Schema.registerDefaultCoercer(numberCoercer);
  Schema.registerDefaultCoercer(booleanCoercer);
  Schema.registerDefaultCoercer(stringCoercer);
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

  test<T>(schemaOrValueType: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
    const normalizedOptions: SchemaTestOptions = { fastErrors: true, ...options };

    const schema = schemaTestableToSchema(schemaOrValueType);
    const result = testSchema(schema, value, normalizedOptions, path);

    if (result.valid) {
      return result;
    }

    if (isUndefined(result.error.stack)) {
      result.error.stack = new Error().stack;
    }

    return result;
  },

  validate<T>(schemaOrValueType: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions): boolean {
    const schema = schemaTestableToSchema(schemaOrValueType);
    const result = this.test(schema, value, options);

    return result.valid;
  },

  parse<T>(schemaOrValueType: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions): T {
    const schema = schemaTestableToSchema(schemaOrValueType);
    const result = this.test(schema, value, options);

    if (result.valid) {
      return result.value;
    }

    throw result.error;
  },

  function<T extends readonly SchemaTestable[], R extends SchemaTestable, F extends (...args: TupleSchemaOutput<T>) => SchemaOutput<R>>(argumentSchemas: T, returnSchema: R, handler: F): F {
    const name = `validated${handler.name.slice(0, 1).toUpperCase()}${handler.name.slice(1)}`;
    const schema: ObjectSchema = getFunctionParametersSchema<T>(argumentSchemas);

    return {
      [name](...unsafeArgs: unknown[]): SchemaOutput<R> {
        const safeArgs = Schema.parse(schema, unsafeArgs, { mask: true }) as TupleSchemaOutput<T>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
        const unsafeResult = handler(...safeArgs);

        return Schema.parse(returnSchema, unsafeResult) as SchemaOutput<R>; // eslint-disable-line @typescript-eslint/no-unsafe-return
      }
    }[name] as F;
  },

  asyncFunction<T extends readonly SchemaTestable[], R extends SchemaTestable, F extends (...args: TupleSchemaOutput<T>) => Promise<SchemaOutput<R>>>(argumentSchemas: T, returnSchema: R, handler: F): F {
    const name = `validated${handler.name.slice(0, 1).toUpperCase()}${handler.name.slice(1)}`;
    const schema: ObjectSchema = getFunctionParametersSchema<T>(argumentSchemas);

    return {
      async [name](...unsafeArgs: unknown[]): Promise<SchemaOutput<R>> {
        const safeArgs = Schema.parse(schema, unsafeArgs, { mask: true }) as TupleSchemaOutput<T>; // eslint-disable-line @typescript-eslint/no-unnecessary-type-assertion
        const unsafeResult = await handler(...safeArgs);

        return Schema.parse(returnSchema, unsafeResult) as SchemaOutput<R>; // eslint-disable-line @typescript-eslint/no-unsafe-return
      }
    }[name] as F;
  }
};

function getFunctionParametersSchema<T extends readonly SchemaTestable[]>(argumentSchemas: T): ObjectSchema<TupleSchemaOutput<T>> {
  const schema: ObjectSchema = {
    factory: { type: Array },
    properties: {}
  };

  argumentSchemas.forEach((arg, index) => (schema.properties[index] = arg));

  return schema;
}

export function testSchema<T>(schema: Schema<T>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  initialize();

  if (isValueSchema(schema)) {
    return testValue(schema, value, options, path);
  }

  if (isTypeSchema(schema)) {
    return testType(schema, value, options, path);
  }

  if (isObjectSchema(schema)) {
    return testObject(schema, value, options, path);
  }

  throw new Error('Unsupported schema');
}

function testType<T>(schema: TypeSchema<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  const resolvedValueType = resolveValueType(schema.type);

  if (isFunction(resolvedValueType)) {
    if ((value instanceof resolvedValueType) || (getValueType(value) == resolvedValueType)) {
      return { valid: true, value: value as T };
    }

    const objectSchema = tryGetObjectSchemaFromReflection(resolvedValueType);

    if (isNotNull(objectSchema)) {
      return testObject(objectSchema, value, options, path);
    }
  }
  else if ((resolvedValueType == 'any') || ((resolvedValueType == 'null') && isNull(value)) || ((resolvedValueType == 'undefined') && isUndefined(value))) {
    return { valid: true, value: value as T };
  }

  return { valid: false, error: SchemaError.expectedButGot(resolvedValueType, getValueType(value), path, { fast: options.fastErrors }) };
}

// eslint-disable-next-line complexity
function testObject<T>(objectSchema: ObjectSchema<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  if (!(value instanceof Object)) {
    return { valid: false, error: SchemaError.expectedButGot(objectSchema.sourceType ?? 'object', getValueType(value), path, { fast: options.fastErrors }) };
  }

  const schema = normalizeObjectSchema(objectSchema as ObjectSchema);
  const mask = schema.mask ?? options.mask ?? false;
  const resultValue: T = isDefined(schema.factory?.type) ? new schema.factory!.type() : {} as Record;

  const schemaPropertyKeys = objectKeys(schema.properties);
  const valuePropertyKeys = objectKeys(value);

  const unknownValuePropertyKeys = differenceSets(new Set(valuePropertyKeys), new Set(schemaPropertyKeys));

  if ((unknownValuePropertyKeys.length > 0) && !mask && !schema.allowUnknownProperties) {
    return { valid: false, error: new SchemaError('Unknown property', { path: path.add(unknownValuePropertyKeys[0]!), fast: options.fastErrors }) };
  }

  for (const key of schemaPropertyKeys) {
    const propertyResult = testSchema(schema.properties[key as string]!, (value as Record)[key], options, path.add(key));

    if (!propertyResult.valid) {
      return propertyResult;
    }

    resultValue[key as keyof T] = propertyResult.value;
  }

  if (schema.allowUnknownProperties) {
    for (const key of unknownValuePropertyKeys) {
      const propertyPath = path.add(key);

      if (isDefined(schema.unknownPropertiesKey)) {
        const keyResult = testSchema(schema.unknownPropertiesKey, key, options);

        if (!keyResult.valid && !mask) {
          return { valid: false, error: new SchemaError('Invalid property key.', { path: propertyPath, inner: keyResult.error, fast: options.fastErrors }) };
        }
      }

      const propertyResult = testSchema(schema.unknownProperties!, (value as Record)[key], options, path.add(key));

      if (!propertyResult.valid && !mask) {
        return propertyResult;
      }

      resultValue[key as keyof T] = propertyResult.value;
    }
  }

  const testResultValue = isUndefined(schema.factory) ? resultValue : isDefined(schema.factory.type) ? resultValue : schema.factory.builder!(resultValue);

  return { valid: true, value: testResultValue };
}

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
function testValue<T>(schema: ValueSchema<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  const normalizedValueSchema = normalizeValueSchema(schema);

  if (normalizedValueSchema.optional && isUndefined(value)) {
    return { valid: true, value: value as unknown as T };
  }

  if (normalizedValueSchema.nullable && isNull(value)) {
    return { valid: true, value: value as unknown as T };
  }

  const context: SchemaContext = {
    schema: normalizedValueSchema,
    options
  };

  /** handle arrays */
  if (normalizedValueSchema.array) {
    if (!isArray(value)) {
      if (normalizedValueSchema.coerce) {
        return testValue(schema, [value], options, path);
      }

      return { valid: false, error: SchemaError.expectedButGot(Array, getValueType(value), path, { fast: options.fastErrors }) };
    }

    for (const arrayConstraint of normalizedValueSchema.arrayConstraints) {
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

    return { valid: true, value: validatedItems as unknown as T };
  }

  let valueTestResult!: SchemaTestResult<unknown>;
  let resultValue: unknown;
  let valueType!: ResolvedValueType;

  function updateCurrentState(newValue: unknown): void {
    valueTestResult = isValidValue(normalizedValueSchema.schema, newValue, options, path);
    resultValue = valueTestResult.valid ? valueTestResult.value : newValue;
    valueType = getValueType(resultValue);
  }

  updateCurrentState(value);

  /** try to coerce */
  if (!valueTestResult.valid) {
    const targetTypes = getSchemaValueTypes(schema);

    const coercers = [
      ...(normalizedValueSchema.coercers.get(valueType) ?? []),
      ...((normalizedValueSchema.coerce || options.coerce == true) ? (defaultCoercers.get(valueType) ?? []) : [])
    ]
      .filter((coercer) => includesValueType(coercer.targetType, targetTypes));

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
      return { valid: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value could not be coerced.', { inner: errors, path, fast: options.fastErrors }) };
    }
  }

  if (!valueTestResult.valid) {
    return valueTestResult;
  }

  if (normalizedValueSchema.valueConstraints.length > 0) {
    const errors: SchemaError[] = [];

    for (const constraint of normalizedValueSchema.valueConstraints) {
      const result = constraint.validate(resultValue, path, context);

      if (!result.valid) {
        errors.push(result.error);
      }
    }

    if (errors.length > 0) {
      return { valid: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value did not match schema.', { path, inner: errors, fast: options.fastErrors }) };
    }
  }

  if (normalizedValueSchema.transformers.length > 0) {
    for (const transformer of normalizedValueSchema.transformers) {
      if (isDefined(transformer.sourceType) && !includesValueType(valueType, resolveValueTypes(transformer.sourceType))) {
        continue;
      }

      const transformResult = transformer.transform(resultValue, path, context) as TransformResult<T & ObjectLiteral>;

      if (isTransformErrorResult(transformResult)) {
        return { valid: false, error: transformResult[transformErrorResultSymbol] };
      }

      return { valid: true, value: transformResult };
    }
  }

  return { valid: true, value: resultValue as T };
}

function isValidValue<T>(validSchemas: Iterable<Schema>, value: unknown, options: SchemaTestOptions, path: JsonPath): SchemaTestResult<T> {
  const errorResults: SchemaTestResult<T>[] = [];

  for (const schema of validSchemas) {
    const result = testSchema(schema, value, options, path);

    if (result.valid) {
      return result;
    }

    errorResults.push(result);
  }

  if (errorResults.length == 1) {
    return errorResults[0]!;
  }

  const errors = errorResults.map((result) => result.error!);

  const expectStrings: string[] = [];

  for (const schema of validSchemas) {
    expectStrings.push(getExpectString(schema));
  }

  const expectString = expectStrings.length > 1 ? `(${expectStrings.join(' | ')})` : expectStrings[0]!;

  return { valid: false, error: SchemaError.expectedButGot(expectString, getValueType(value), path, { inner: errors, fast: options.fastErrors }) };
}

export function getExpectString(schema: SchemaTestable): string {
  const expectedNames = getSchemaTypeNames(schema);
  const arraySuffix = (isValueSchema(schema) && (schema.array == true)) ? '[]' : '';
  const expectedTypeString = (expectedNames.length == 1) ? `${expectedNames[0]}${arraySuffix}` : `(${expectedNames.join(' | ')})${arraySuffix}`;

  const expects = isValueSchema(schema) ? toArray(schema.valueConstraints ?? []).map((constraint) => constraint.expects) : [];
  const expectsString = (expects.length > 0) ? `[${expects.join(', ')}]` : '';

  return `${expectedTypeString}${expectsString}`;
}
