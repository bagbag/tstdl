/**
 * @module
 * Defines core ORM types, including tagged types for representing database column types
 * (like Uuid, Timestamp, Json, etc.) and helper types for working with Drizzle ORM features
 * like primary keys and default values. It also re-exports common decorators and schemas.
 */
import type { $Type, HasDefault as DrizzleHasDefault, IsPrimaryKey as DrizzleIsPrimaryKey } from 'drizzle-orm';
import type { boolean, doublePrecision, integer, jsonb, PgColumnBuilder, PgColumnBuilderBase, PgEnumColumnBuilderInitial, text, uuid } from 'drizzle-orm/pg-core';

import { Array, Integer } from '#/schema/index.js';
import type { AbstractConstructor, EnumerationObject, EnumerationValue, ObjectLiteral, UnionToTuple } from '#/types.js';
import type { GetTagMetadata, HasTag, Tagged, UnwrapTagged } from '#/types/index.js';
import type { bytea, numericDate, timestamp } from './data-types/index.js';
import { Check, Column, Embedded, Encrypted, Index, PrimaryKey, References, Table, Unique } from './decorators.js';
import { Json, NumericDate, Timestamp, Uuid } from './schemas/index.js';

/** Tag identifier for column type information. */
export type ColumnTypeTag = 'column';

/** Tag identifier for embedded type configuration. */
export type EmbeddedConfigTag = 'embedded';

/**
 * Helper type to tag a column type as being a primary key.
 * It wraps the original type `T` and associates Drizzle's `IsPrimaryKey` marker
 * with the underlying Drizzle column builder type stored in the tag metadata.
 * @template T - The original column type (e.g., Uuid, Integer).
 */
export type IsPrimaryKey<T> =
  T extends Tagged<unknown, ColumnTypeTag, PgColumnBuilderBase>
  ? Tagged<UnwrapTagged<T>, ColumnTypeTag, DrizzleIsPrimaryKey<GetTagMetadata<T, ColumnTypeTag>>>
  : Tagged<T, ColumnTypeTag, DrizzleIsPrimaryKey<ColumnBuilder<T>>>;

/**
 * Helper type to tag a column type as having a default value.
 * It wraps the original type `T` and associates Drizzle's `HasDefault` marker
 * with the underlying Drizzle column builder type stored in the tag metadata.
 * @template T - The original column type (e.g., Uuid, Timestamp).
 */
export type HasDefault<T> =
  T extends Tagged<unknown, ColumnTypeTag, PgColumnBuilderBase>
  ? Tagged<UnwrapTagged<T>, ColumnTypeTag, DrizzleHasDefault<GetTagMetadata<T, ColumnTypeTag>>>
  : Tagged<T, ColumnTypeTag, DrizzleHasDefault<ColumnBuilder<T>>>;

type EnumColumn<T extends string | number, ColumnName extends string = ''> = PgEnumColumnBuilderInitial<ColumnName, UnionToTuple<`${T}`> extends [string, ...string[]] ? UnionToTuple<`${T}`> : ['NO_VALUES_PROVIDED']>;

type TextTuple<T extends string> = UnionToTuple<`${T}`> extends [string, ...string[]] ? UnionToTuple<`${T}`> : [string];

type HandledColumnName<T extends string = never> = [T] extends [never] ? '' : T;

/**
 * Utility type to infer the Drizzle column builder type based on a TypeScript type `T`.
 * Handles primitive types (string, number, boolean), arrays, enums, Uint8Array,
 * and existing tagged column types.
 * @template T - The TypeScript type to map to a column builder.
 * @template ColumnName - Optional column name for context.
 */
export type ColumnBuilder<T, ColumnName extends string = never> =
  HasTag<T> extends true ? T extends Tagged<unknown, ColumnTypeTag, any> ? GetTagMetadata<T, ColumnTypeTag> : never
  : T extends string ? ReturnType<typeof text<HandledColumnName<ColumnName>, string, TextTuple<T>>>
  : T extends number ? ReturnType<typeof doublePrecision<HandledColumnName<ColumnName>>>
  : T extends boolean ? ReturnType<typeof boolean<HandledColumnName<ColumnName>>>
  : T extends Uint8Array ? ReturnType<typeof bytea<HandledColumnName<ColumnName>>>
  : T extends EnumerationObject ? EnumColumn<EnumerationValue<T>, HandledColumnName<ColumnName>>
  : T extends (infer U)[] ? ReturnType<ColumnBuilder<U, HandledColumnName<ColumnName>>['array']>
  : never;

/**
 * Tagged type representing an embedded class configuration.
 * Stores the embedded type `T` and an optional column name prefix `P`.
 * @template T - The constructor of the class being embedded.
 * @template P - An optional prefix for the column names generated from the embedded class properties.
 */
export type Embedded<T = AbstractConstructor, P extends string = ''> = Tagged<T, EmbeddedConfigTag, { prefix: P }>;

/**
 * Tagged type representing a PostgreSQL array column.
 * Wraps an existing tagged column type `T` and derives the Drizzle array column builder.
 * @template T - The tagged type of the array elements.
 */
export type Array<T extends Tagged<ObjectLiteral, ColumnTypeTag, PgColumnBuilder<any>>> = Tagged<UnwrapTagged<T>[], ColumnTypeTag, ReturnType<GetTagMetadata<T, ColumnTypeTag>['array']>>;

/**
 * Tagged type representing a JSONB column.
 * Stores the TypeScript type `T` that the JSONB data represents.
 * @template T - The TypeScript type of the data stored in the JSONB column.
 */
export type Json<T> = Tagged<T, ColumnTypeTag, $Type<ReturnType<typeof jsonb>, T>>;

/**
 * Tagged type representing a PostgreSQL enum column.
 * Derives the enum values and the Drizzle enum column builder from the provided enum object `T`.
 * @template T - The enumeration object type.
 */
export type Enum<T extends string | number> = Tagged<T, ColumnTypeTag, EnumColumn<T>>;

/** Tagged type representing a `text` column. */
export type Text<T extends string = string> = Tagged<string, ColumnTypeTag, ReturnType<typeof text<string, TextTuple<T>>>>;

/** Tagged type representing a `uuid` column. Stores the UUID as a string. */
export type Uuid = Tagged<string, ColumnTypeTag, ReturnType<typeof uuid>>;

/** Tagged type representing an `integer` column. */
export type Integer = Tagged<number, ColumnTypeTag, ReturnType<typeof integer>>;

/** Tagged type representing a `double precision` column. */
export type DoublePrecision = Tagged<number, ColumnTypeTag, ReturnType<typeof doublePrecision>>;

/** Tagged type representing a `boolean` column. */
export type Boolean = Tagged<number, ColumnTypeTag, ReturnType<typeof boolean>>;

/** Tagged type representing a custom `numericDate` column (stores date as number YYYYMMDD). */
export type NumericDate = Tagged<number, ColumnTypeTag, ReturnType<typeof numericDate>>;

/** Tagged type representing a `timestamp` column (stores timestamp as number - milliseconds since epoch). */
export type Timestamp = Tagged<number, ColumnTypeTag, ReturnType<typeof timestamp>>;

/** Tagged type representing a `bytea` (byte array) column. */
export type Bytea = Tagged<Uint8Array, ColumnTypeTag, ReturnType<typeof bytea>>;

/**
 * Tagged type representing an encrypted column.
 * Stores the original TypeScript type `T`, but the underlying database type is `bytea`.
 * @template T - The original (unencrypted) type of the data.
 */
export type Encrypted<T> = Tagged<T, ColumnTypeTag, ReturnType<typeof bytea>>;

export { Array, Check, Column, Embedded, Encrypted, Index, Integer, Json, NumericDate, PrimaryKey, References, Table, Timestamp, Unique, Uuid };
