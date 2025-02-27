import type { $Type, HasDefault as DrizzleHasDefault, IsPrimaryKey as DrizzleIsPrimaryKey } from 'drizzle-orm';
import type { boolean, date, doublePrecision, integer, jsonb, PgColumnBuilder, PgColumnBuilderBase, PgEnumColumnBuilderInitial, text, timestamp, uuid } from 'drizzle-orm/pg-core';

import { Array, Integer } from '#/schema/index.js';
import type { AbstractConstructor, EnumerationObject, EnumerationValue, ObjectLiteral, UnionToTuple } from '#/types.js';
import type { GetTagMetadata, HasTag, Tagged, UnwrapTagged } from '#/types/index.js';
import { Check, Column, Embedded, Encrypted, Index, PrimaryKey, References, Unique } from './decorators.js';
import { Json, NumericDate, Timestamp, Uuid } from './schemas/index.js';
import type { bytea } from './server/data-types/index.js';

export type ColumnTypeTag = 'column';
export type EmbeddedConfigTag = 'embedded';

export type IsPrimaryKey<T> =
  T extends Tagged<unknown, ColumnTypeTag, PgColumnBuilderBase>
  ? Tagged<UnwrapTagged<T>, ColumnTypeTag, DrizzleIsPrimaryKey<GetTagMetadata<T, ColumnTypeTag>>>
  : Tagged<T, ColumnTypeTag, DrizzleIsPrimaryKey<ColumnBuilder<T>>>;

export type HasDefault<T> =
  T extends Tagged<unknown, ColumnTypeTag, PgColumnBuilderBase>
  ? Tagged<UnwrapTagged<T>, ColumnTypeTag, DrizzleHasDefault<GetTagMetadata<T, ColumnTypeTag>>>
  : Tagged<T, ColumnTypeTag, DrizzleHasDefault<ColumnBuilder<T>>>;

type EnumColumn<T extends EnumerationObject, ColumnName extends string = ''> = PgEnumColumnBuilderInitial<ColumnName, UnionToTuple<`${EnumerationValue<T>}`> extends [string, ...string[]] ? UnionToTuple<`${EnumerationValue<T>}`> : ['NO_VALUES_PROVIDED']>;

export type ColumnBuilder<T, ColumnName extends string = never> =
  HasTag<T> extends true ? T extends Tagged<T, ColumnTypeTag, any> ? GetTagMetadata<T, ColumnTypeTag> : never
  : T extends string ? string extends ColumnName ? ReturnType<typeof text<ColumnName, string, [string, ...string[]]>> : ReturnType<typeof text<string, [string, ...string[]]>>
  : T extends number ? string extends ColumnName ? ReturnType<typeof doublePrecision<ColumnName>> : ReturnType<typeof doublePrecision>
  : T extends boolean ? string extends ColumnName ? ReturnType<typeof boolean<ColumnName>> : ReturnType<typeof boolean>
  : T extends Uint8Array ? string extends ColumnName ? ReturnType<typeof bytea<ColumnName>> : ReturnType<typeof bytea>
  : T extends EnumerationObject ? string extends ColumnName ? EnumColumn<T, ColumnName> : EnumColumn<T>
  : T extends (infer U)[] ? string extends ColumnName ? ReturnType<ColumnBuilder<U, ColumnName>['array']> : ReturnType<ColumnBuilder<U>['array']>
  : never;

export type Embedded<T = AbstractConstructor, P extends string = ''> = Tagged<T, EmbeddedConfigTag, { prefix: P }>;
export type Array<T extends Tagged<ObjectLiteral, ColumnTypeTag, PgColumnBuilder<any>>> = Tagged<UnwrapTagged<T>[], ColumnTypeTag, ReturnType<GetTagMetadata<T, ColumnTypeTag>['array']>>;
export type Json<T> = Tagged<T, ColumnTypeTag, $Type<ReturnType<typeof jsonb>, T>>;
export type Enum<T extends EnumerationObject> = Tagged<EnumerationValue<T>, ColumnTypeTag, EnumColumn<T>>;
export type Text = Tagged<string, ColumnTypeTag, ReturnType<typeof text<string, [string, ...string[]]>>>;
export type Uuid = Tagged<string, ColumnTypeTag, ReturnType<typeof uuid>>;
export type Integer = Tagged<number, ColumnTypeTag, ReturnType<typeof integer>>;
export type DoublePrecision = Tagged<number, ColumnTypeTag, ReturnType<typeof doublePrecision>>;
export type Boolean = Tagged<number, ColumnTypeTag, ReturnType<typeof boolean>>;
export type NumericDate = Tagged<number, ColumnTypeTag, ReturnType<typeof date>>;
export type Timestamp = Tagged<number, ColumnTypeTag, ReturnType<typeof timestamp>>;
export type Bytea = Tagged<Uint8Array, ColumnTypeTag, ReturnType<typeof bytea>>;
export type Encrypted<T> = Tagged<T, ColumnTypeTag, ReturnType<typeof bytea>>;

export { Array, Check, Column, Embedded, Encrypted, Index, Integer, Json, NumericDate, PrimaryKey, References, Timestamp, Unique, Uuid };
