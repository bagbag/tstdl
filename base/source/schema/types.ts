/* eslint-disable @typescript-eslint/ban-types */

import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany, Record, Type } from '#/types';
import { hasOwnProperty } from '#/utils/object/object';
import { isArray, isDefined, isFunction, isObject, isString } from '#/utils/type-guards';
import type { Schema } from './schema';
import type { SchemaError } from './schema.error';

declare const schemaOutputTypeSymbol: unique symbol;

export type SchemaFactoryFunction<T extends Record, O = T> = (data: T) => NormalizeValueType<O>;
export type SchemaFactory<T extends Record, O = T> =
  | { type: Type<T>, builder?: undefined }
  | { type?: undefined, builder: SchemaFactoryFunction<T, O> };

export type ObjectSchemaProperties<T extends Record> = { [K in keyof T]-?: OneOrMany<ValueType<T[K]>> };
export type NormalizedObjectSchemaProperties<T> = { [K in keyof T]: Schema<T[K]> };

export type SchemaOutput<T extends Schema> =
  | T extends ObjectSchema<infer U> ? U
  : T extends ValueSchema<infer _, infer U> ? U
  : never;

export type ObjectSchema<T extends Record = any, O extends Record = T> = {
  [schemaOutputTypeSymbol]?: O,
  factory?: SchemaFactory<T, O>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties?: OneOrMany<ValueType>
};

export type ValueSchema<T = unknown, O = T> = {
  type: OneOrMany<ValueType<T, O>>,
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
  type: Set<ResolvedValueType<T, O>>,
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
  schema: NormalizedValueSchema,
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
  : T;

export type NormalizeToValueType<T> =
  T extends string ? typeof String
  : T extends number ? typeof Number
  : T extends boolean ? typeof Boolean
  : T extends bigint ? typeof BigInt
  : T extends symbol ? typeof Symbol
  : T extends undefined ? 'undefined'
  : T extends null ? 'null'
  : never;

export type ValueType<T = any, O = T> = Schema<T, O> | Type<O> | NormalizeToValueType<T> | DeferredValueType<T, O> | 'undefined' | 'null' | 'any';
export type DeferredValueType<T = any, O = T> = { deferred: () => ValueType<T, O> };
export type ResolvedValueType<T = any, O = T> = Exclude<ValueType<T, O>, DeferredValueType>;

export type ValueTypeOutput<T extends ValueType | DeferredValueType> = T extends (ValueType<infer _, infer O> | DeferredValueType<infer _, infer O>) ? NormalizeValueType<O> : never;

export type Coercible = { coerce?: boolean };

export const primitiveValueTypes: ValueType[] = [String, Number, Boolean, BigInt, Symbol, Function, 'undefined', 'null'];
export const primitiveValueTypesSet = new Set(primitiveValueTypes);

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
  abstract readonly sourceType: OneOrMany<ValueType<T, O>>;
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

export function valueSchema<T, O = T>(schema: ValueSchema<T, O>): ValueSchema<T, O> {
  return schema;
}

export function isSchema<T, O>(value: ValueType<T, O>): value is Schema<T, O> {
  return isObjectSchema(value) || isValueSchema(value);
}

export function isObjectSchema<T extends Record, O extends Record>(value: ValueType<T, O>): value is ObjectSchema<T, O> {
  return isObject((value as Partial<ObjectSchema> | undefined)?.properties);
}

export function isValueSchema<T, O>(value: ValueType<T, O>): value is ValueSchema<T, O> {
  return isObject(value) && isDefined((value as Partial<ValueSchema> | undefined)?.type);
}

export function isDeferredValueType<T, O>(value: ValueType<T, O>): value is DeferredValueType<T, O> {
  return isObject(value) && hasOwnProperty(value as DeferredValueType, 'deferred');
}

export function deferrableValueTypesToValueTypes<T, O>(valueTypes: OneOrMany<ValueType<T, O>>): OneOrMany<ValueType<T, O>> {
  if (isArray(valueTypes)) {
    return valueTypes.flatMap((valueType) => deferrableValueTypesToValueTypes(valueType));
  }

  return isDeferredValueType(valueTypes)
    ? valueTypes.deferred()
    : valueTypes;
}

export function valueTypeToSchema<T, O>(valueType: ValueType<T, O>): Schema<T, O> {
  if (isFunction(valueType) || isString(valueType)) {
    const b = valueSchema({ type: valueType as Type<O> }) as Schema<T, O>;
    return b;
  }

  if (isDeferredValueType(valueType)) {
    return valueTypeToSchema(valueType.deferred());
  }

  return valueType;
}

export function valueTypesToSchema<T, O>(valueType: OneOrMany<ValueType<T, O>>): Schema<T, O> {
  if (isFunction(valueType) || isArray(valueType) || isString(valueType)) {
    return valueSchema({ type: valueType });
  }

  if (isDeferredValueType(valueType)) {
    return valueTypeToSchema(valueType);
  }

  return valueType;
}
