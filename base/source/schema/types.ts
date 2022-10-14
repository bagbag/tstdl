/* eslint-disable @typescript-eslint/ban-types */

import type { JsonPath } from '#/json-path/json-path';
import type { AbstractConstructor, OneOrMany, Record, Type, TypedOmit } from '#/types';
import { filterObject, hasOwnProperty } from '#/utils/object/object';
import { isArray, isDefined, isFunction, isObject } from '#/utils/type-guards';
import type { NormalizedSchema, Schema, SchemaTestable } from './schema';
import type { SchemaError } from './schema.error';

declare const schemaOutputTypeSymbol: unique symbol;

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
  [schemaOutputTypeSymbol]?: T,
  sourceType?: ValueType,
  factory?: SchemaFactory<T>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties?: OneOrMany<SchemaTestable>
};

export type TypeSchema<T = any> = { type: ValueType<T> };

export type NormalizedTypeSchema<T = any> = { foo: ResolvedValueType<T> };

export type ValueSchema<T = unknown> = {
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
  allowUnknownProperties: Set<Schema>
};

export type NormalizedValueSchema<T = any> = {
  [schemaOutputTypeSymbol]?: T,
  schema: Set<Schema<T>>,
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
  : T extends number ? typeof Number
  : T extends boolean ? typeof Boolean
  : T extends bigint ? typeof BigInt
  : T extends symbol ? typeof Symbol
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

export abstract class SchemaArrayConstraint {
  abstract validate(value: readonly unknown[], path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export type OptionKeys<T extends Record> = readonly (keyof T)[];

export abstract class SchemaValueConstraint {
  abstract readonly suitableTypes: OneOrMany<ValueType>;
  abstract readonly expects: OneOrMany<string>;

  abstract validate(value: unknown, path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export abstract class SchemaValueTransformer<T = any, O = any> {
  abstract readonly sourceType?: OneOrMany<ValueType<T>>;

  abstract transform(value: T, path: JsonPath, context: TransformerContext): TransformResult<O>;
}

export abstract class SchemaValueCoercer {
  abstract readonly sourceType: OneOrMany<ValueType>;
  abstract readonly targetType: ValueType;

  abstract coerce(value: unknown, path: JsonPath, context: CoercerContext): CoerceResult;
}

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
  return filterObject(properties, isDefined) as ObjectSchemaProperties<T>;
}

export function objectSchema<T extends Record>(schema: ObjectSchema<T>): ObjectSchema<T> {
  return filterObject(schema, isDefined) as ObjectSchema<T>;
}

export function valueSchema<T>(schema: OneOrMany<SchemaTestable<T>>, options?: TypedOmit<ValueSchema<T>, 'schema'>): ValueSchema<T> {
  return filterObject({ schema, ...options }, isDefined) as ValueSchema<T>;
}

export function typeSchema<T>(type: ValueType<T>): TypeSchema<NormalizeValueType<T>> {
  return { type } as TypeSchema<NormalizeValueType<T>>;
}

export function isSchema<T>(value: any): value is Schema<T> {
  return isObjectSchema(value) || isValueSchema(value) || isTypeSchema(value);
}

export function isObjectSchema<T extends Record>(schema: Schema<T>): schema is ObjectSchema<T>;
export function isObjectSchema<T extends Record>(schema: any): schema is ObjectSchema<T>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isObjectSchema(schema: any): schema is ObjectSchema {
  return isObject((schema as Partial<ObjectSchema> | undefined)?.properties);
}

export function isValueSchema<T>(schema: Schema<T>): schema is ValueSchema<T>;
export function isValueSchema<T>(schema: any): schema is ValueSchema<T>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isValueSchema(schema: any): schema is ValueSchema {
  return isObject(schema) && isDefined((schema as ValueSchema | undefined)?.schema);
}

export function isTypeSchema<T>(schema: Schema<T>): schema is TypeSchema<T>;
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

export function isDeferredValueType<T>(value: ValueType<T>): value is DeferredValueType<T>;
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

export function valueTypesOrSchemasToSchemas<T>(valueTypesOrSchemas: OneOrMany<SchemaTestable<T>>): OneOrMany<Schema<T>> {
  if (isArray(valueTypesOrSchemas)) {
    return valueTypesOrSchemas.map(schemaTestableToSchema);
  }

  return schemaTestableToSchema(valueTypesOrSchemas);
}

export function schemaTestableToSchema<T>(valueTypeOrSchema: SchemaTestable<T>): Schema<T> {
  if (isSchema<T>(valueTypeOrSchema)) {
    return valueTypeOrSchema;
  }

  return typeSchema(valueTypeOrSchema) as Schema<T>;
}
