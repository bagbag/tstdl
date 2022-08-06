import { JsonPath } from '#/json-path';
import { reflectionRegistry } from '#/reflection';
import type { Record, Type } from '#/types';
import { toArray } from '#/utils/array/array';
import { memoizeSingle } from '#/utils/function';
import { noop } from '#/utils/noop';
import { objectKeys } from '#/utils/object/object';
import { differenceSets } from '#/utils/set';
import { isArray, isDefined, isFunction, isNull, isObject, isString, isUndefined } from '#/utils/type-guards';
import { booleanCoercer } from './coercers/boolean.coercer';
import { dateCoercer } from './coercers/date.coercer';
import { numberCoercer } from './coercers/number.coercer';
import { regExpCoercer } from './coercers/regexp.coercer';
import { stringCoercer } from './coercers/string.coercer';
import { uint8ArrayCoercer } from './coercers/uint8-array.coercer';
import type { SchemaPropertyReflectionData, SchemaTypeReflectionData } from './decorators';
import { SchemaError } from './schema.error';
import type { NormalizedValueSchema, ObjectSchema, SchemaContext, SchemaFactoryFunction, SchemaTestOptions, SchemaTestResult, SchemaValueCoercer, ValueSchema, ValueType } from './types';
import { isObjectSchema, primitiveValueTypesSet } from './types';
import { getArrayItemSchema, getValueType, getValueTypeName, maybeDeferredValueTypesToValueTypes, normalizeSchema, normalizeValueSchema } from './utils';

export type Schema<T = any> = ObjectSchema<T> | ValueSchema<T>;

export const getSchemaFromReflection = memoizeSingle(_getObjectSchemaFromReflection);

const defaultCoercers = new Map<ValueType, SchemaValueCoercer[]>();

export type SchemaTestable<T = any> = Schema<T> | Type<T>;

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

  test<T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
    const result = this.testWithFastError(schema, value, options, path);

    if (result.success) {
      return result;
    }

    return { success: false, error: new SchemaError(result.error.message, { ...result.error, fast: false }, result.error.cause) };
  },

  validate<T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions): boolean {
    const result = this.test(schema, value, options);
    return result.success;
  },

  parse<T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions): T {
    const result = this.test(schema, value, options);

    if (result.success) {
      return result.value;
    }

    throw result.error;
  },

  /**
   * disables stack traces for errors
   * @deprecated for internal use only
   */
  testWithFastError<T>(schema: SchemaTestable<T>, value: unknown, options?: SchemaTestOptions, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
    initialize();

    if (isFunction(schema) || isObjectSchema<T>(schema)) {
      return testObject(schema, value, options, path);
    }

    return testValue(schema, value, options, path);
  }
};

// eslint-disable-next-line complexity
function testObject<T>(schemaOrType: ObjectSchema<T> | Type<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  if (isFunction(schemaOrType) && (value instanceof schemaOrType)) {
    return { success: true, value: value as T };
  }

  if (!(value instanceof Object) && !isObject(value)) {
    const expected = isFunction(schemaOrType) ? schemaOrType : Object;
    return { success: false, error: SchemaError.expectedButGot(expected, getValueType(value), path) };
  }

  const unnormalizedSchema = isFunction(schemaOrType) ? getSchemaFromReflection(schemaOrType) : schemaOrType;

  if (isNull(unnormalizedSchema)) {
    return { success: false, error: SchemaError.expectedButGot(schemaOrType, getValueType(value), path) };
  }

  const schema = normalizeSchema(unnormalizedSchema);
  const mask = schema.mask ?? options.mask ?? false;
  const resultValue = isDefined(schema.factory?.type) ? new schema.factory!.type() : {} as Record;

  const schemaPropertyKeys = objectKeys(schema.properties);
  const valuePropertyKeys = objectKeys(value);

  const unknownValuePropertyKeys = differenceSets(new Set(valuePropertyKeys), new Set(schemaPropertyKeys));

  if ((unknownValuePropertyKeys.length > 0) && !(mask || (schema.allowUnknownProperties.size > 0))) {
    return { success: false, error: new SchemaError('Unknown property', { path: path.add(unknownValuePropertyKeys[0]!) }) };
  }

  for (const key of schemaPropertyKeys) {
    const propertyResult = Schema.testWithFastError(schema.properties[key], (value as Record)[key], options, path.add(key));

    if (!propertyResult.success) {
      return propertyResult;
    }

    resultValue[key] = propertyResult.value;
  }

  if (schema.allowUnknownProperties.size > 0) {
    for (const key of unknownValuePropertyKeys) {
      const errors: SchemaError[] = [];

      for (const allowedSchema of schema.allowUnknownProperties) {
        const propertyResult = Schema.testWithFastError(allowedSchema, (value as Record)[key], options, path.add(key));

        if (!propertyResult.success && !mask) {
          errors.push(propertyResult.error);
          continue;
        }

        resultValue[key] = propertyResult.value;
        break;
      }

      if (errors.length > 0) {
        return { success: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value did not match any allowed schemas.', { inner: errors, path }) };
      }
    }
  }

  const testResultValue = isUndefined(schema.factory) ? resultValue : isDefined(schema.factory.type) ? resultValue : schema.factory.builder!(resultValue);

  return { success: true, value: testResultValue };
}

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
function testValue<T>(schema: ValueSchema<T>, value: unknown, options: SchemaTestOptions = {}, path: JsonPath = JsonPath.ROOT): SchemaTestResult<T> {
  const valueSchema = normalizeValueSchema(schema);

  if (valueSchema.optional && isUndefined(value)) {
    return { success: true, value: value as unknown as T };
  }

  if (valueSchema.nullable && isNull(value)) {
    return { success: true, value: value as unknown as T };
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

      if (!result.success) {
        return { success: false, error: result.error };
      }
    }

    const itemSchema = getArrayItemSchema(schema);
    const validatedItems = [];

    for (let i = 0; i < value.length; i++) {
      const result = testValue(itemSchema, value[i], options, path.add(i));

      if (!result.success) {
        return result;
      }

      validatedItems.push(result.value);
    }

    return { success: true, value: validatedItems as unknown as T };
  }

  let valueType = getValueType(value);
  let validType = isValidType(valueSchema, valueType);
  let resultValue = value;

  /** try to coerce with custom coercers */
  if (!validType) {
    const coercers = valueSchema.coercers.get(valueType);

    if (isDefined(coercers)) {
      const errors: SchemaError[] = [];

      for (const coercer of coercers) {
        const coerceResult = coercer.coerce(resultValue, path, context);

        if (!coerceResult.success) {
          errors.push(coerceResult.error);
          continue;
        }

        resultValue = coerceResult.value;
        valueType = getValueType(resultValue);
        validType = isValidType(valueSchema, valueType);
        break;
      }

      if ((errors.length > 0)) {
        return { success: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value could not be coerced.', { inner: errors, path }) };
      }
    }
  }

  /** try to coerce with default coercers if enabled */
  if (!validType && (valueSchema.coerce || options.coerce == true)) {
    const coercers = defaultCoercers.get(valueType);

    if (isDefined(coercers)) {
      const errors: SchemaError[] = [];

      for (const coercer of coercers) {
        const coerceResult = coercer.coerce(resultValue, path, context);

        if (!coerceResult.success) {
          errors.push(coerceResult.error);
          continue;
        }

        resultValue = coerceResult.value;
        valueType = getValueType(resultValue);
        validType = isValidType(valueSchema, valueType);
        break;
      }

      if ((errors.length > 0)) {
        return { success: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value could not be coerced.', { inner: errors, path }) };
      }
    }
  }

  /** check for sub-schemas */
  if (!validType) {
    const errors: SchemaError[] = [];

    for (const type of valueSchema.type) {
      if (primitiveValueTypesSet.has(type)) {
        continue;
      }

      const result = Schema.testWithFastError(type as Type | ObjectSchema<T>, resultValue, options, path);

      if (!result.success) {
        errors.push(result.error);
        continue;
      }

      resultValue = result.value;
      validType = true;
      break;
    }

    if (!validType && (errors.length > 0)) {
      return { success: false, error: (errors.length == 1) ? errors[0]! : new SchemaError('Value did not match any allowed schemas.', { inner: errors, path }) };
    }
  }

  if (!validType) {
    const expectedNames = [...valueSchema.type].map((exp) => (isString(exp) ? exp : getValueTypeName(exp)));
    const expectedTypeString = expectedNames.length == 1
      ? expectedNames[0]!
      : `[${expectedNames.join(', ')}]`;

    const expects = valueSchema.valueConstraints.map((constraint) => constraint.expects);
    const expectsString = expects.length > 0 ? ` (${expects.join(', ')})` : '';

    return { success: false, error: SchemaError.expectedButGot(`${expectedTypeString}${expectsString}`, getValueType(resultValue), path) };
  }

  if (valueSchema.transformers.length > 0) {
    for (const transformer of valueSchema.transformers) {
      resultValue = transformer.transform(resultValue, path, context);
    }

    valueType = getValueType(resultValue);
    validType = isValidType(valueSchema, valueType);

    if (!validType) {
      const typeString = isFunction(valueType) ? valueType.name : valueType as string;
      throw new Error(`Transformers resulted in invalid type (${typeString}).`);
    }
  }

  for (const constraint of valueSchema.valueConstraints) {
    const result = constraint.validate(resultValue, path, context);

    if (!result.success) {
      return { success: false, error: result.error };
    }
  }

  return { success: true, value: resultValue as T };
}

function isValidType(valueSchema: NormalizedValueSchema, valueType: ValueType): boolean {
  return valueSchema.type.has(valueType) || valueSchema.type.has('any');
}

function _getObjectSchemaFromReflection<T>(type: Type<T>): ObjectSchema<T> | null {
  const metadata = reflectionRegistry.getMetadata(type);

  if (!metadata.registered) {
    return null;
  }

  const typeData = metadata.data.tryGet<SchemaTypeReflectionData>('schema');

  const properties: Record<PropertyKey, ValueSchema> = {};

  for (const [key, propertyMetadata] of metadata.properties) {
    const reflectionData = propertyMetadata.data.tryGet<Partial<SchemaPropertyReflectionData>>('schema');
    const itemType = isDefined(reflectionData?.type) ? maybeDeferredValueTypesToValueTypes(reflectionData!.type) : undefined;
    const array = ((propertyMetadata.type == Array) && (itemType != Array)) || (reflectionData?.array == true);

    if (array && (isUndefined(itemType) || (isArray(itemType) && (itemType.length == 0)))) {
      throw new Error(`Item type missing on type ${type.name} at property "${String(key)}"`);
    }

    properties[key] = {
      type: itemType ?? propertyMetadata.type,
      array,
      optional: reflectionData?.optional,
      nullable: reflectionData?.nullable,
      coerce: reflectionData?.coerce,
      coercers: reflectionData?.coercers,
      transformers: reflectionData?.transformers,
      arrayConstraints: reflectionData?.arrayConstraints,
      valueConstraints: reflectionData?.valueConstraints
    };
  }

  const objectSchema: ObjectSchema = {
    factory: isDefined(typeData?.factory) ? { builder: typeData!.factory as SchemaFactoryFunction<T> } : { type },
    properties,
    mask: typeData?.mask,
    allowUnknownProperties: typeData?.allowUnknownProperties
  };

  return objectSchema;
}
