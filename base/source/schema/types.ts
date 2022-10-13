/* eslint-disable @typescript-eslint/ban-types */

import type { JsonPath } from '#/json-path/json-path';
import type { AbstractConstructor, OneOrMany, Record, Type, TypedOmit } from '#/types';
import { filterObject } from '#/utils/object/object';
import { isArray, isDefined, isFunction, isObject } from '#/utils/type-guards';
import type { NormalizedSchema, Schema, SchemaTestable } from './schema';
import type { SchemaError } from './schema.error';

declare const schemaOutputTypeSymbol: unique symbol;

export type SchemaFactoryFunction<T, O = T> = (data: T) => NormalizeValueType<O>;
export type SchemaFactory<T, O = T> =
  | { type: Type<T>, builder?: undefined }
  | { type?: undefined, builder: SchemaFactoryFunction<T, O> };

export type ObjectSchemaProperties<T> = { [K in keyof T]-?: OneOrMany<SchemaTestable<any, T[K]>> };
export type NormalizedObjectSchemaProperties<T> = { [K in keyof T]-?: Schema<any, T[K]> };

export type SchemaInput<T extends SchemaTestable> =
  | T extends ObjectSchema<infer U, any> ? U
  : T extends ValueSchema<infer U, any> ? U
  : T extends TypeSchema<infer U> ? U
  : T extends ValueType<infer U> ? NormalizeValueType<U>
  : never;

export type SchemaOutput<T extends SchemaTestable> =
  | T extends ObjectSchema<any, infer O> ? O
  : T extends ValueSchema<any, infer O> ? O
  : T extends TypeSchema<infer O> ? O
  : T extends ValueType<infer O> ? NormalizeValueType<O>
  : never;

export type TupleSchemaOutput<T extends readonly SchemaTestable[]> = { [P in keyof T]: SchemaOutput<T[P]> };

export type ObjectSchemaOrType<T = any, O = T> = ObjectSchema<T, O> | AbstractConstructor<O>;

export type ObjectSchema<T = any, O = T> = {
  [schemaOutputTypeSymbol]?: O,
  sourceType?: ValueType,
  factory?: SchemaFactory<T, O>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties?: OneOrMany<SchemaTestable>
};

export type TypeSchema<T = any> = { type: ValueType<T> };

export type NormalizedTypeSchema<T = any> = { foo: ResolvedValueType<T> };

export type ValueSchema<T = unknown, O = T> = {
  [schemaOutputTypeSymbol]?: O,
  schema: OneOrMany<SchemaTestable<T, O>>,
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

export type NormalizedObjectSchema<T = any, O = T> = {
  [schemaOutputTypeSymbol]?: O,
  factory?: SchemaFactory<T, O>,
  properties: NormalizedObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties: Set<Schema>
};

export type NormalizedValueSchema<T = any, O = T> = {
  [schemaOutputTypeSymbol]?: O,
  schema: Set<Schema<T, O>>,
  array: boolean,
  optional: boolean,
  nullable: boolean,
  coerce: boolean,
  coercers: Map<ValueType, SchemaValueCoercer[]>,
  transformers: readonly SchemaValueTransformer<any, any, any>[],
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

export abstract class SchemaValueTransformer<T = any, O = T, TransformOutput = O> {
  abstract readonly sourceType: OneOrMany<ValueType<T>>;
  abstract readonly targetType: ValueType<TransformOutput>;

  abstract transform(value: O, path: JsonPath, context: TransformerContext): TransformResult<TransformOutput>;
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

export type TransformResult<T> =
  | { success: true, value: T, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };

export function objectSchemaProperties<T extends Record>(properties: ObjectSchemaProperties<T>): ObjectSchemaProperties<T> {
  return filterObject(properties, isDefined) as ObjectSchemaProperties<T>;
}

export function objectSchema<T extends Record, O extends Record = T>(schema: ObjectSchema<T, O>): ObjectSchema<T, O> {
  return filterObject(schema, isDefined) as ObjectSchema<T, O>;
}

export function valueSchema<T, O = T>(schema: OneOrMany<SchemaTestable<T, O>>, options?: TypedOmit<ValueSchema<T, O>, 'schema'>): ValueSchema<T, O> {
  return filterObject({ schema, ...options }, isDefined) as ValueSchema<T, O>;
}

export function typeSchema<T>(type: ValueType<T>): TypeSchema<NormalizeValueType<T>> {
  return { type } as TypeSchema<NormalizeValueType<T>>;
}

export function isSchema<T, O>(value: any): value is Schema<T, O> {
  return isObjectSchema(value) || isValueSchema(value) || isTypeSchema(value);
}

export function isObjectSchema<T extends Record, O extends Record>(schema: Schema<T, O>): schema is ObjectSchema<T, O>;
export function isObjectSchema<T extends Record, O extends Record>(schema: any): schema is ObjectSchema<T, O>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isObjectSchema(schema: any): schema is ObjectSchema {
  return isObject((schema as Partial<ObjectSchema> | undefined)?.properties);
}

export function isValueSchema<T, O>(schema: Schema<T, O>): schema is ValueSchema<T, O>;
export function isValueSchema<T, O>(schema: any): schema is ValueSchema<T, O>; // eslint-disable-line @typescript-eslint/unified-signatures
export function isValueSchema(schema: any): schema is ValueSchema {
  return isObject(schema) && isDefined((schema as ValueSchema | undefined)?.schema);
}

export function isTypeSchema<T, O>(schema: Schema<T, O>): schema is TypeSchema<O>;
export function isTypeSchema<T, O>(schema: any): schema is TypeSchema<O>; // eslint-disable-line @typescript-eslint/unified-signatures
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
    return valueTypes.flatMap((valueType) => resolveValueTypes(valueType));
  }

  return resolveValueType(valueTypes);
}

export function resolveValueType<T>(valueType: ValueType<T>): ResolvedValueType<T> {
  return isDeferredValueType(valueType)
    ? resolveValueType(valueType.deferred())
    : valueType as ResolvedValueType<T>;
}

export function valueTypesOrSchemasToSchemas<T, O>(valueTypesOrSchemas: OneOrMany<SchemaTestable<T, O>>): OneOrMany<Schema<T, O>> {
  if (isArray(valueTypesOrSchemas)) {
    return valueTypesOrSchemas.map(schemaTestableToSchema);
  }

  return schemaTestableToSchema(valueTypesOrSchemas);
}

export function schemaTestableToSchema<T, O>(valueTypeOrSchema: SchemaTestable<T, O>): Schema<T, O> {
  if (isSchema<T, O>(valueTypeOrSchema)) {
    return valueTypeOrSchema;
  }

  return typeSchema(valueTypeOrSchema) as TypeSchema<O>;
}
