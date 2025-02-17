/* eslint-disable @typescript-eslint/no-redeclare, @typescript-eslint/naming-convention */

import type { $Type, HasDefault as DrizzleHasDefault, IsPrimaryKey as DrizzleIsPrimaryKey } from 'drizzle-orm';
import type { boolean, date, doublePrecision, integer, jsonb, PgColumnBuilder, PgColumnBuilderBase, PgEnumColumnBuilderInitial, text, timestamp, uuid } from 'drizzle-orm/pg-core';
import type { GetTagMetadata, Tagged, UnwrapTagged } from 'type-fest';

import { Array, Integer } from '#/schema/index.js';
import type { AbstractConstructor, EnumerationObject, EnumerationValue, ObjectLiteral, UnionToTuple } from '#/types.js';
import { Column, Embedded, Index, PrimaryKey, References, Unique } from './decorators.js';
import { Json, NumericDate, Timestamp, Uuid } from './schemas/index.js';

export type IsPrimaryKey<T> =
  T extends Tagged<unknown, 'column', PgColumnBuilderBase> ? Tagged<UnwrapTagged<T>, 'column', DrizzleIsPrimaryKey<GetTagMetadata<T, 'column'>>>
  : Tagged<T, 'column', ColumnBuilder<T>>;

export type HasDefault<T> =
  T extends Tagged<unknown, 'column', PgColumnBuilderBase> ? Tagged<UnwrapTagged<T>, 'column', DrizzleHasDefault<GetTagMetadata<T, 'column'>>>
  : Tagged<T, 'column', ColumnBuilder<T>>;

type EnumColumn<T extends EnumerationObject, ColumnName extends string = ''> = PgEnumColumnBuilderInitial<ColumnName, UnionToTuple<`${EnumerationValue<T>}`> extends [string, ...string[]] ? UnionToTuple<`${EnumerationValue<T>}`> : ['NO_VALUES_PROVIDED']>;

export type ColumnBuilder<T, ColumnName extends string = never> =
  T extends Tagged<T, 'column', any> ? GetTagMetadata<T, 'column'> :
  T extends string ? string extends ColumnName ? ReturnType<typeof text<ColumnName, string, [string, ...string[]]>> : ReturnType<typeof text<string, [string, ...string[]]>> :
  T extends number ? string extends ColumnName ? ReturnType<typeof doublePrecision<ColumnName>> : ReturnType<typeof doublePrecision> :
  T extends boolean ? string extends ColumnName ? ReturnType<typeof boolean<ColumnName>> : ReturnType<typeof boolean> :
  T extends EnumerationObject ? string extends ColumnName ? EnumColumn<T, ColumnName> : EnumColumn<T> :
  T extends (infer U)[] ? string extends ColumnName ? ReturnType<ColumnBuilder<U, ColumnName>['array']> : ReturnType<ColumnBuilder<U>['array']> :
  never;

export type TypeBuilder<T, ColumnName extends string = never> =
  [ColumnName] extends [never] ?
  T extends Tagged<any, 'column', PgColumnBuilderBase> ? T :
  T extends infer U ? Tagged<U, 'column', ColumnBuilder<U>> :
  never : never;

export declare const embedded: unique symbol;

export type Embedded<T = AbstractConstructor, P extends string = ''> = T & { [embedded]?: { prefix: P } };

export type Array<T extends Tagged<ObjectLiteral, 'column', PgColumnBuilder<any>>> = Tagged<UnwrapTagged<T>[], 'column', ReturnType<GetTagMetadata<T, 'column'>['array']>>;
export type Json<T extends ObjectLiteral = ObjectLiteral> = Tagged<T, 'column', $Type<ReturnType<typeof jsonb>, T>>;
export type Enum<T extends EnumerationObject> = Tagged<EnumerationValue<T>, 'column', EnumColumn<T>>;
export type Text = Tagged<string, 'column', ReturnType<typeof text<string, [string, ...string[]]>>>;
export type Uuid = Tagged<string, 'column', ReturnType<typeof uuid>>;
export type Integer = Tagged<number, 'column', ReturnType<typeof integer>>;
export type DoublePrecision = Tagged<number, 'column', ReturnType<typeof doublePrecision>>;
export type Boolean = Tagged<number, 'column', ReturnType<typeof boolean>>;
export type NumericDate = Tagged<number, 'column', ReturnType<typeof date>>;
export type Timestamp = Tagged<number, 'column', ReturnType<typeof timestamp>>;

export { Array, Column, Embedded, Index, Integer, Json, NumericDate, PrimaryKey, References, Timestamp, Unique, Uuid };
