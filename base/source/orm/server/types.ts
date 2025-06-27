import type { BuildColumns, NotNull } from 'drizzle-orm';
import type { PgColumnBuilder, PgTableWithColumns } from 'drizzle-orm/pg-core';
import type { CamelCase, ConditionalPick, SnakeCase } from 'type-fest';

import type { JsonPath } from '#/json-path/json-path.js';
import type { Record } from '#/schema/index.js';
import type { UnionToIntersection } from '#/types.js';
import type { Tagged } from '#/types/index.js';
import type { OrmColumnReflectionData } from '../decorators.js';
import type { EntityType } from '../entity.js';
import type { ColumnBuilder, EmbeddedConfigTag } from '../types.js';

export type BuildTypeOptions = {
  skipPrimaryKey?: boolean,
};

export type ColumnDefinition = {
  name: string,
  objectPath: JsonPath,
  reflectionData: OrmColumnReflectionData | undefined,
  buildType: (options: BuildTypeOptions) => PgColumnBuilder<any, any, any, any>,
  dereferenceObjectPath: (obj: Record) => any,
  toDatabase: (value: unknown, context: TransformContext) => any,
  fromDatabase: (value: unknown, context: TransformContext) => any,
};

export type ColumnDefinitionsMap = Map<string, ColumnDefinition>;

export type TransformContext = {
  encryptionKey?: CryptoKey,
};

type Column<Name extends string, T> = null extends T ? ColumnBuilder<Exclude<T, null>, Name> : NotNull<ColumnBuilder<T, Name>>;

export type ColumnPrefix<T> = T extends Tagged<unknown, EmbeddedConfigTag, { prefix: infer Prefix }> ? Prefix extends string ? Prefix : '' : '';

export type PgTableFromType<T extends EntityType = EntityType, S extends string = string, TableName extends string = T extends Required<EntityType> ? SnakeCase<T['entityName']> : string> = PgTableWithColumns<{
  name: TableName,
  schema: S,
  columns: BuildColumns<
    TableName,
    { [P in Exclude<keyof InstanceType<T>, keyof EmbeddedProperties<InstanceType<T>>>]: Column<CamelCase<Extract<P, string>>, InstanceType<T>[P]>; }
    & UnionToIntersection<{ [P in keyof EmbeddedProperties<InstanceType<T>>]: EmbeddedColumns<InstanceType<T>[P], ColumnPrefix<InstanceType<T>[P]>>; }[keyof EmbeddedProperties<InstanceType<T>>]>,
    'pg'>,
  dialect: 'pg',
}>;

export type EmbeddedProperties<T> = ConditionalPick<T, Tagged<unknown, EmbeddedConfigTag, { prefix: any }>>;
export type EmbeddedColumns<T, Prefix extends string> = { [P in keyof T as CamelCase<`${Prefix}${Extract<P, string>}`>]: Column<CamelCase<`${Prefix}${Extract<P, string>}`>, T[P]> };
