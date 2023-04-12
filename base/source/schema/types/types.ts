/* eslint-disable @typescript-eslint/ban-types */

import type { AbstractConstructor, OneOrMany, Record, Type, TypedOmit } from '#/types.js';
import { distinct } from '#/utils/array/array.js';
import { filterObject, hasOwnProperty, mapObjectValues, objectEntries, objectKeys } from '#/utils/object/object.js';
import { assert, isArray, isDefined, isFunction, isObject, isString } from '#/utils/type-guards.js';
import type { SchemaError } from '../schema.error.js';
import type { NormalizedSchema, Schema, SchemaTestable } from '../schema.js';
import type { SchemaArrayConstraint } from './schema-array-constraint.js';
import type { SchemaValueCoercer } from './schema-value-coercer.js';
import type { SchemaValueConstraint } from './schema-value-constraint.js';
import type { SchemaValueTransformer } from './schema-value-transformer.js';

declare const schemaOutputTypeSymbol: unique symbol;

const optimized = Symbol('schema optimized');

export type SchemaFactoryFunction<T> = (data: T) => T;
export type SchemaFactory<T> =
  | { type: Type<T>, builder?: undefined }
  | { type?: undefined, builder: SchemaFactoryFunction<T> };

export type ObjectSchemaProperties<T> = { [K in keyof T]-?: OneOrMany<SchemaTestable<T[K]>> };
export type NormalizedObjectSchemaProperties<T> = { [K in keyof T]-?: Schema<T[K]> };

export type SchemaOutput<T extends SchemaTestable> =
  | T extends ObjectSchema<infer O> ? O
  : T extends ValueSchema<infer O> ? O
  : T extends TypeSchema<infer O> ? O
  : T extends ValueType<infer O> ? NormalizeValueType<O>
  : never;

export type TupleSchemaOutput<T extends readonly SchemaTestable[]> = { [P in keyof T]: SchemaOutput<T[P]> };

export type ObjectSchemaOrType<T = any> = ObjectSchema<T> | AbstractConstructor<T>;

export type ObjectSchema<T = any> = {
  [optimized]?: boolean,
  [schemaOutputTypeSymbol]?: T,
  sourceType?: ValueType,
  factory?: SchemaFactory<T>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  unknownProperties?: OneOrMany<SchemaTestable>,
  unknownPropertiesKey?: OneOrMany<SchemaTestable>
};

export type TypedObjectSchemaUnknownProperties<K extends PropertyKey, V> = {
  unknownProperties?: OneOrMany<SchemaTestable<V>>,
  unknownPropertiesKey?: OneOrMany<SchemaTestable<K>>
};

export type TypeSchema<T = any> = { type: ValueType<T> };

export type NormalizedTypeSchema<T = any> = { foo: ResolvedValueType<T> };

export type ValueSchema<T = unknown> = {
  [optimized]?: boolean,
  [schemaOutputTypeSymbol]?: T,
  schema: OneOrMany<SchemaTestable<T>>,
  array?: boolean,
  optional?: boolean,
  nullable?: boolean,

  /** use default coercers */
  coerce?: boolean,

  /** custom coercers */
  coercers?: OneOrMany<SchemaValueCoercer>,
  transformers?: OneOrMany<SchemaValueTransformer>,
  arrayConstraints?: OneOrMany<SchemaArrayConstraint>,
  valueConstraints?: OneOrMany<SchemaValueConstraint>
};

export type ValueSchemaOptions = TypedOmit<ValueSchema, 'schema' | typeof schemaOutputTypeSymbol>;

export type NormalizedObjectSchema<T = any> = {
  [schemaOutputTypeSymbol]?: T,
  factory?: SchemaFactory<T>,
  properties: NormalizedObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties: boolean,
  unknownProperties?: Schema,
  unknownPropertiesKey?: Schema
};

export type NormalizedValueSchema<T = any> = {
  [schemaOutputTypeSymbol]?: T,
  schema: Schema<T>[],
  array: boolean,
  optional: boolean,
  nullable: boolean,
  coerce: boolean,
  coercers: Map<ValueType, SchemaValueCoercer[]>,
  transformers: readonly SchemaValueTransformer[],
  arrayConstraints: readonly SchemaArrayConstraint[],
  valueConstraints: readonly SchemaValueConstraint[]
};

export type SchemaContext = {
  schema: NormalizedSchema,
  options: SchemaTestOptions
};

export type ConstraintContext = SchemaContext;

export type TransformerContext = SchemaContext;

export type CoercerContext = SchemaContext;

export type NormalizeValueType<T> =
  | T extends String ? string
  : T extends Number ? number
  : T extends Boolean ? boolean
  : T extends BigInt ? bigint
  : T extends Symbol ? symbol
  : T extends 'undefined' ? undefined
  : T extends 'null' ? null
  : T extends 'any' ? any
  : T;

export type NormalizeToValueType<T> =
  T extends string | String ? typeof String
  : T extends number | Number ? typeof Number
  : T extends boolean | Boolean ? typeof Boolean
  : T extends bigint | BigInt ? typeof BigInt
  : T extends symbol | Symbol ? typeof Symbol
  : T extends undefined ? 'undefined'
  : T extends null ? 'null'
  : T extends any ? 'any'
  : never;

export type ValueType<T = any> = AbstractConstructor<T> | NormalizeToValueType<T> | DeferredValueType<T>;
export type DeferredValueType<T = any> = { deferred: () => ValueType<T> };
export type ResolvedValueType<T = any> = Exclude<ValueType<T>, DeferredValueType>;

export type Coercible = { coerce?: boolean };

export const primitiveConstructors: ValueType[] = [String, Number, Boolean, Symbol as unknown as AbstractConstructor, BigInt as unknown as AbstractConstructor, Function, 'undefined', 'null'];
export const primitiveConstructorSet = new Set(primitiveConstructors);

export type OptionKeys<T extends Record> = readonly (keyof T)[];

export type SchemaTestOptions = {
  /**
   * Try to convert wrong input into desired output.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  coerce?: boolean,

  /**
   * Remove unspecified fields on input data instead of raising an error.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  mask?: boolean,

  /**
   * Use fast errors which can improve performance a lot but misses detailed stack traces.
   */
  fastErrors?: boolean
};

export type SchemaTestResult<T> =
  | { valid: true, value: T, error?: undefined }
  | { valid: false, value?: undefined, error: SchemaError };

export type ConstraintResult =
  | { valid: true, error?: undefined }
  | { valid: false, error: SchemaError };

export type CoerceResult =
  | { success: true, value: any, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };


export const transformErrorResultSymbol = Symbol('Transform error');
export type TransformErrorResult = { [transformErrorResultSymbol]: SchemaError };

export type TransformResult<T> = T | TransformErrorResult;

export function transformErrorResult(error: SchemaError): TransformErrorResult {
  return { [transformErrorResultSymbol]: error };
}

export function isTransformErrorResult(value: any): value is TransformErrorResult {
  return isObject(value) && hasOwnProperty(value as TransformErrorResult, transformErrorResultSymbol);
}

export function objectSchemaProperties<T extends Record>(properties: ObjectSchemaProperties<T>): ObjectSchemaProperties<T> {
  return optimizeObjectSchemaProperties(properties);
}

export function objectSchema<T extends Record>(schema: ObjectSchema<T>): ObjectSchema<T> {
  return optimizeObjectSchema(schema);
}

export function valueSchema<T>(schema: OneOrMany<SchemaTestable<T>>, options?: TypedOmit<ValueSchema<T>, 'schema'>): ValueSchema<T> {
  assert(!isArray(schema) || (schema.length > 0), 'No schema provided.');
  return optimizeValueSchema({ schema, ...options });
}

export function typeSchema<T>(type: ValueType<T>): TypeSchema<NormalizeValueType<T>> {
  return { type } as TypeSchema<NormalizeValueType<T>>;
}

export function isSchema<T>(value: any): value is Schema<T> {
  return isObjectSchema(value) || isValueSchema(value) || isTypeSchema(value);
}

export function isObjectSchema<T extends Record = any>(schema: SchemaTestable<T>): schema is ObjectSchema<T>;
export function isObjectSchema<T extends Record = any>(schema: any): schema is ObjectSchema<T>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isObjectSchema(schema: any): schema is ObjectSchema {
  return isObject((schema as Partial<ObjectSchema> | undefined)?.properties);
}

export function isValueSchema<T>(schema: SchemaTestable<T>): schema is ValueSchema<T>;
export function isValueSchema<T>(schema: any): schema is ValueSchema<T>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isValueSchema(schema: any): schema is ValueSchema {
  return isObject(schema) && isDefined((schema as ValueSchema | undefined)?.schema);
}

export function isTypeSchema<T>(schema: SchemaTestable<T>): schema is TypeSchema<T>;
export function isTypeSchema<T>(schema: any): schema is TypeSchema<T>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isTypeSchema(schema: any): schema is TypeSchema {
  if (!isObject(schema)) {
    return false;
  }

  const type = (schema as TypeSchema).type;

  return isObject(schema)
    && (
      isFunction(type)
      || (isObject(type) && isFunction(type.deferred))
      || (type == 'undefined')
      || (type == 'null')
      || (type == 'any')
    );
}

export function isDeferredValueType<T>(value: SchemaTestable<T>): value is DeferredValueType<T>;
export function isDeferredValueType(value: any): value is DeferredValueType;
export function isDeferredValueType(value: any): value is DeferredValueType {
  return isObject(value) && isFunction((value as DeferredValueType).deferred);
}

export function resolveValueTypes<T>(valueTypes: OneOrMany<ValueType<T>>): OneOrMany<ResolvedValueType<T>> {
  if (isArray(valueTypes)) {
    return valueTypes.map(resolveValueType);
  }

  return resolveValueType(valueTypes);
}

export function resolveValueType<T>(valueType: ValueType<T>): ResolvedValueType<T> {
  return isDeferredValueType(valueType)
    ? resolveValueType(valueType.deferred())
    : valueType as ResolvedValueType<T>;
}

export function schemaTestablesToSchemas<T>(schemaTestables: OneOrMany<SchemaTestable<T>>): OneOrMany<Schema<T>> {
  if (isArray(schemaTestables)) {
    if (schemaTestables.length == 1) {
      return schemaTestableToSchema(schemaTestables[0]!);
    }

    if (schemaTestables.length == 0) {
      throw new Error('No schema provided.');
    }

    return schemaTestables.map(schemaTestableToSchema);
  }

  return schemaTestableToSchema(schemaTestables);
}

export function schemaTestableToSchema<T>(valueTypeOrSchema: SchemaTestable<T>): Schema<T> {
  if (isSchema<T>(valueTypeOrSchema)) {
    return valueTypeOrSchema;
  }

  return typeSchema(valueTypeOrSchema) as Schema<T>;
}

export function optimizeObjectSchema<T>(schema: ObjectSchema<T>): ObjectSchema<T> {
  if (schema[optimized] == true) {
    return schema;
  }

  return filterObject({
    [optimized]: true,
    ...schema,
    properties: optimizeObjectSchemaProperties(schema.properties),
    unknownProperties: isDefined(schema.unknownProperties) ? optimizeSchema(schema.unknownProperties) : undefined,
    unknownPropertiesKey: isDefined(schema.unknownPropertiesKey) ? optimizeSchema(schema.unknownPropertiesKey) : undefined
  }, isDefined) as ObjectSchema<T>;
}

export function optimizeObjectSchemaProperties<T>(properties: ObjectSchemaProperties<T>): ObjectSchemaProperties<T> {
  return mapObjectValues(properties, optimizeSchema) as ObjectSchemaProperties<T>;
}

export function optimizeValueSchema<T>(schema: ValueSchema<T>): ValueSchema<T> {
  const optimizedSchema = optimizeSchema(schema);
  return isValueSchema<T>(optimizedSchema) ? optimizedSchema : { [optimized]: true, schema: optimizedSchema };
}

export function optimizeSchema<T>(schema: OneOrMany<SchemaTestable<T>>): OneOrMany<SchemaTestable<T>> { // eslint-disable-line complexity
  interface OptimizableSchemaArray {
    [optimized]?: boolean;
  }

  if (isArray(schema)) {
    if ((schema as OptimizableSchemaArray)[optimized] == true) {
      return schema;
    }

    if (schema.length == 1) {
      return optimizeSchema(schema[0]!);
    }

    if (schema.length == 0) {
      throw new Error('No schema provided.');
    }

    const optimizedSchemas = distinct(distinct(schema).flatMap(optimizeSchema));
    (optimizedSchemas as OptimizableSchemaArray)[optimized] = true;
    return optimizedSchemas;
  }

  if (isFunction(schema) || isString(schema) || isDeferredValueType(schema)) {
    return schema;
  }

  if (isTypeSchema(schema)) {
    return schema.type;
  }

  if (isValueSchema(schema)) {
    if (schema[optimized] == true) {
      return schema;
    }

    const entries = objectEntries(schema).filter(([, value]) => isDefined(value));

    if (entries.length == 1) {
      return optimizeSchema(schema.schema);
    }

    if (isValueSchema(schema.schema)) {
      const combinedProperties = new Set([...objectKeys(schema), ...objectKeys(schema.schema)]);

      if (
        isValueSchema(schema.schema)
        && !combinedProperties.has('array')
        && !combinedProperties.has('coerce')
        && !combinedProperties.has('coercers')
        && !combinedProperties.has('transformers')
        && !combinedProperties.has('arrayConstraints')
        && !combinedProperties.has('valueConstraints')
      ) {
        return {
          [optimized]: true,
          schema: optimizeSchema(schema.schema.schema as SchemaTestable<T>),
          ...filterObject({
            optional: ((schema.optional ?? false) || (schema.schema.optional ?? false)) ? true : undefined,
            nullable: ((schema.nullable ?? false) || (schema.schema.nullable ?? false)) ? true : undefined
          }, isDefined)
        };
      }
    }

    const { schema: innerSchema, optional, nullable, coercers, transformers, arrayConstraints, valueConstraints, ...rest } = schema;

    return filterObject({
      [optimized]: true,
      schema: optimizeSchema(innerSchema),
      optional: (optional ?? false) ? true : undefined,
      nullable: (nullable ?? false) ? true : undefined,
      coercers: optimizeOneOrMany(coercers),
      transformers: optimizeOneOrMany(transformers),
      arrayConstraints: optimizeOneOrMany(arrayConstraints),
      valueConstraints: optimizeOneOrMany(valueConstraints),
      ...rest
    } satisfies ValueSchema<T>, isDefined) as ValueSchema<T>;
  }

  return optimizeObjectSchema(schema);
}

function optimizeOneOrMany<T>(values: OneOrMany<T> | undefined): OneOrMany<T> | undefined {
  if (isArray(values)) {
    if (values.length == 0) {
      return undefined;
    }

    if (values.length == 1) {
      return values[0];
    }
  }

  return values;
}
