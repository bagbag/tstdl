import type { JsonPath } from '#/json-path/json-path';
import type { OneOrMany, Record, Type } from '#/types';
import { hasOwnProperty } from '#/utils/object/object';
import { isDefined, isObject } from '#/utils/type-guards';
import type { Schema } from './schema';
import type { SchemaError } from './schema.error';

declare const schemaTypeSymbol: unique symbol;

export type SchemaFactoryFunction<T extends Record> = (data: T) => T;
export type SchemaFactory<T extends Record> =
  | { type: Type<T, []>, builder?: undefined }
  | { type?: undefined, builder: SchemaFactoryFunction<T> };

export type ObjectSchemaProperties<T extends Record> = {
  [K in keyof T]-?: MaybeDeferredValueTypes<T[K]>;
};

export type SchemaOutput<T extends Schema | Type> =
  | T extends ObjectSchema<infer U> ? U
  : T extends ValueSchema<infer U> ? U
  : T extends Type<infer U> ? U
  : never;

export type ObjectSchema<T extends Record = any> = {
  factory?: SchemaFactory<T>,
  properties: ObjectSchemaProperties<T>,
  mask?: boolean,
  allowUnknownProperties?: MaybeDeferredValueTypes
};

export type ValueSchema<T = any> = {
  [schemaTypeSymbol]?: T,
  type: MaybeDeferredValueTypes,
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

export type NormalizedObjectSchema<T extends Record = any> = {
  factory?: SchemaFactory<T>,
  properties: {
    [K in keyof T]: Schema<T[K]>;
  },
  mask?: boolean,
  allowUnknownProperties: Set<Schema>
};

export type NormalizedValueSchema<T = any> = {
  type: Set<ValueType<T>>,
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
  schema: NormalizedValueSchema,
  options: SchemaTestOptions
};

export type ConstraintContext = SchemaContext;

export type TransformerContext = SchemaContext;

export type CoercerContext = SchemaContext;

export type ValueType<T = any> = Schema<T> | Type<T> | typeof BigInt | typeof Symbol | typeof Function | 'undefined' | 'null' | 'any';
export type DeferredValueType<T> = { deferred: () => ValueType<T> };
export type MaybeDeferredValueType<T = any> = ValueType<T> | DeferredValueType<T>;

export type ValueTypes<T = any> = OneOrMany<ValueType<T>>;
export type DeferredValueTypes<T = any> = { deferred: () => ValueTypes<T> };
export type MaybeDeferredValueTypes<T = any> = OneOrMany<ValueTypes<T> | DeferredValueTypes<T>> | MaybeDeferredValueTypes<T>[];

export type Coercible = { coerce?: boolean };

export const primitiveValueTypes: ValueType[] = [String, Number, Boolean, BigInt, Symbol, Function, 'undefined', 'null', 'any'];
export const primitiveValueTypesSet = new Set(primitiveValueTypes);

export abstract class SchemaArrayConstraint {
  abstract validate(value: readonly unknown[], path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export type OptionKeys<T extends Record> = readonly (keyof T)[];

export abstract class SchemaValueConstraint {
  abstract readonly suitableTypes: ValueTypes;
  abstract readonly expects: OneOrMany<string>;

  abstract validate(value: unknown, path: JsonPath, context: ConstraintContext): ConstraintResult;
}

export abstract class SchemaValueTransformer {
  abstract readonly sourceType: ValueTypes;
  abstract readonly targetType: ValueType;

  abstract transform(value: unknown, path: JsonPath, context: TransformerContext): TransformResult;
}

export abstract class SchemaValueCoercer {
  abstract readonly sourceType: ValueTypes;
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

export type TransformResult =
  | { success: true, value: any, error?: undefined }
  | { success: false, value?: undefined, error: SchemaError };

export function objectSchema<T extends ObjectSchema>(schema: T): T {
  return schema;
}

export function valueSchema<T extends ValueSchema>(schema: T): T {
  return schema;
}

export function isSchema<T>(value: ValueType<T>): value is Schema<T> {
  return isObjectSchema(value) || isValueSchema(value);
}

export function isObjectSchema<T>(value: ValueType<T>): value is ObjectSchema<T> {
  return isObject((value as Partial<ObjectSchema> | undefined)?.properties);
}

export function isValueSchema<T>(value: ValueType<T>): value is ValueSchema<T> {
  return isObject(value) && isDefined((value as Partial<ValueSchema> | undefined)?.type);
}

export function isDeferredValueType<T>(value: MaybeDeferredValueTypes<T>): value is (DeferredValueType<T> | DeferredValueTypes<T>) {
  return isObject(value) && hasOwnProperty((value as DeferredValueTypes), 'deferred');
}
