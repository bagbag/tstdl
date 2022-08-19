/* eslint-disable @typescript-eslint/ban-types */

import type { JsonPath } from '#/json-path/json-path';
import type { AbstractConstructor, OneOrMany, Record, Type, TypedOmit } from '#/types';
import { isArray, isDefined, isFunction, isObject } from '#/utils/type-guards';
import type { NormalizedSchema, Schema, SchemaTestable } from './schema';
import type { SchemaError } from './schema.error';

declare const schemaOutputTypeSymbol: unique symbol;

export type SchemaFactoryFunction<T extends Record, O = T> = (data: T) => NormalizeValueType_FOO<O>;
export type SchemaFactory<T extends Record, O = T> =
  | { type: Type<T>, builder?: undefined }
  | { type?: undefined, builder: SchemaFactoryFunction<T, O> };

export type ObjectSchemaProperties<T extends Record> = { [K in keyof T]-?: OneOrMany<Schema<T[K]>> };
export type NormalizedObjectSchemaProperties<T> = { [K in keyof T]-?: Schema<T[K]> };

export type SchemaOutput<T extends SchemaTestable> =
  | T extends ObjectSchema<any, infer O> ? O
  : T extends ValueSchema<any, infer O> ? O
  : T extends TypeSchema<infer O> ? O
  : never;

export type ObjectSchema<T extends Record = any, O extends Record = T> = {
  [schemaOutputTypeSymbol]?: O,
  sourceType?: ValueType_FOO,
  factory?: SchemaFactory<T, O>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties?: OneOrMany<Schema>
};

export type TypeSchema<T = any> = { type: ValueType_FOO<T> };

export type NormalizedTypeSchema<T = any> = { foo: ResolvedValueType_FOO<T> };

export type ValueSchema<T = unknown, O = T> = {
  [schemaOutputTypeSymbol]?: O,
  schema: OneOrMany<Schema<T, O>>,
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

export type NormalizedObjectSchema<T extends Record = any, O extends Record = T> = {
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
  coercers: Map<ValueType_FOO, SchemaValueCoercer[]>,
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

export type NormalizeValueType_FOO<T> =
  | T extends String ? string
  : T extends Number ? number
  : T extends Boolean ? boolean
  : T extends BigInt ? bigint
  : T extends Symbol ? symbol
  : T extends 'undefined' ? undefined
  : T extends 'null' ? null
  : T extends 'any' ? any
  : T;

export type NormalizeToValueType_FOO<T> =
  T extends string | String ? typeof String
  : T extends number ? typeof Number
  : T extends boolean ? typeof Boolean
  : T extends bigint ? typeof BigInt
  : T extends symbol ? typeof Symbol
  : T extends undefined ? 'undefined'
  : T extends null ? 'null'
  : T extends any ? 'any'
  : never;

export type ValueType_FOO<T = any> = AbstractConstructor<T> | NormalizeToValueType_FOO<T> | DeferredValueType_FOO<T>;
export type DeferredValueType_FOO<T = unknown> = { deferred: () => ValueType_FOO<T> };
export type ResolvedValueType_FOO<T = unknown> = Exclude<ValueType_FOO<T>, DeferredValueType_FOO>;

export type ValueType_FOOOutput<T extends ValueType_FOO> = T extends ValueType_FOO<infer U> ? NormalizeValueType_FOO<U> : never;

export type Coercible = { coerce?: boolean };

export const primitiveConstructors: ValueType_FOO[] = [String, Number, Boolean, Symbol as unknown as AbstractConstructor, BigInt as unknown as AbstractConstructor, Function, 'undefined', 'null'];
export const primitiveConstructorSet = new Set(primitiveConstructors);

export abstract class SchemaArrayConstraint {
  abstract validate(value: readonly unknown[], path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export type OptionKeys<T extends Record> = readonly (keyof T)[];

export abstract class SchemaValueConstraint {
  abstract readonly suitableTypes: OneOrMany<ValueType_FOO>;
  abstract readonly expects: OneOrMany<string>;

  abstract validate(value: unknown, path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export abstract class SchemaValueTransformer<T = any, O = T, TransformOutput = O> {
  abstract readonly sourceType: OneOrMany<ValueType_FOO<T>>;
  abstract readonly targetType: ValueType_FOO<TransformOutput>;

  abstract transform(value: O, path: JsonPath, context: TransformerContext): TransformResult<TransformOutput>;
}

export abstract class SchemaValueCoercer {
  abstract readonly sourceType: OneOrMany<ValueType_FOO>;
  abstract readonly targetType: ValueType_FOO;

  abstract coerce(value: unknown, path: JsonPath, context: CoercerContext): CoerceResult;
}

export type SchemaTestOptions = {
  /**
   * try to convert wrong input into desired output.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  coerce?: boolean,

  /**
   * remove unspecified fields on input data instead of raising an error.
   * Can be specified on definition and validation. If specified on both, definition has higher priority
   */
  mask?: boolean
};

export type SchemaTestResult<T> =
  | { success: true, value: T, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };

export type ConstraintResult =
  | { success: true, error?: undefined }
  | { success: false, error: SchemaError };

export type CoerceResult =
  | { success: true, value: any, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };

export type TransformResult<T> =
  | { success: true, value: T, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };

export function objectSchema<T, O = T>(schema: ObjectSchema<T, O>): ObjectSchema<T, O> {
  return schema;
}

export function valueSchema<T, O = T>(schema: OneOrMany<Schema<T, O>>, options?: TypedOmit<ValueSchema<T, O>, 'schema'>): ValueSchema<T, O> {
  return { schema, ...options };
}

export function typeSchema<T>(type: ValueType_FOO<T>): TypeSchema<NormalizeValueType_FOO<T>> {
  return { type } as TypeSchema<NormalizeValueType_FOO<T>>;
}

export function isSchema<T extends Record, O extends Record>(value: any): value is Schema<T, O> {
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
  return isObject(schema) && isFunction((schema as TypeSchema | undefined)?.type);
}

export function isDeferredValueType<T>(value: ValueType_FOO<T>): value is DeferredValueType_FOO<T> {
  return isObject(value) && isFunction((value as DeferredValueType_FOO).deferred);
}

export function resolveValueTypes<T>(valueTypes: OneOrMany<ValueType_FOO<T>>): OneOrMany<ResolvedValueType_FOO<T>> {
  if (isArray(valueTypes)) {
    return valueTypes.flatMap((valueType) => resolveValueTypes(valueType));
  }

  return resolveValueType(valueTypes);
}

export function resolveValueType<T>(valueType: ValueType_FOO<T>): ResolvedValueType_FOO<T> {
  return isDeferredValueType(valueType)
    ? resolveValueType(valueType.deferred())
    : valueType as ResolvedValueType_FOO<T>;
}

export function valueTypesOrSchemasToSchemas<T, O>(valueTypesOrSchemas: OneOrMany<ValueType_FOO<O> | Schema<T, O>>): OneOrMany<Schema<T, O>> {
  if (isArray(valueTypesOrSchemas)) {
    return valueTypesOrSchemas.map(valueTypeOrSchemaToSchema);
  }

  return valueTypeOrSchemaToSchema(valueTypesOrSchemas);
}

export function valueTypeOrSchemaToSchema<T, O>(valueTypeOrSchema: ValueType_FOO<O> | Schema<T, O>): Schema<T, O> {
  if (isSchema<T, O>(valueTypeOrSchema)) {
    return valueTypeOrSchema;
  }

  return typeSchema(valueTypeOrSchema) as TypeSchema<O>;
}
