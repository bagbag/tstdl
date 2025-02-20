import { and, eq, gt, gte, inArray, isNotNull, isNull, isSQLWrapper, lt, lte, ne, not, notInArray, or, SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { Primitive, Record } from '#/types.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isPrimitive, isRegExp, isString, isUndefined } from '#/utils/type-guards.js';
import type { EntityType } from '../entity.js';
import type { ComparisonEqualsQuery, ComparisonGreaterThanOrEqualsQuery, ComparisonGreaterThanQuery, ComparisonInQuery, ComparisonLessThanOrEqualsQuery, ComparisonLessThanQuery, ComparisonNotEqualsQuery, ComparisonNotInQuery, ComparisonRegexQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query } from '../query.js';
import type { ColumnDefinition, PgTableFromType } from './types.js';

const sqlTrue = sql`true`;

export function convertQuery(query: Query, table: PgTableFromType<string, EntityType>, columnDefinitionsMap: Map<string, ColumnDefinition>): SQL {
  if (query instanceof SQL) {
    return query;
  }

  if (isSQLWrapper(query)) {
    return sql`${query}`;
  }

  const queryEntries = objectEntries(query) as [string, Primitive | Record][];

  if (queryEntries.length == 0) {
    return sqlTrue;
  }

  for (const [property, value] of queryEntries) {
    const isPrimitiveValue = isPrimitive(value);

    if (property == '$and') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      const andQuery = and(...(query as LogicalAndQuery).$and.map((item) => convertQuery(item, table, columnDefinitionsMap)));

      if (isUndefined(andQuery)) {
        return sqlTrue;
      }

      return andQuery;
    }

    if (property == '$or') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      const orQuery = or(...(query as LogicalOrQuery).$or.map((item) => convertQuery(item, table, columnDefinitionsMap)));

      if (isUndefined(orQuery)) {
        return sqlTrue;
      }

      return orQuery;
    }

    if (property == '$nor') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      const orQuery = or(...(query as LogicalNorQuery).$nor.map((item) => convertQuery(item, table, columnDefinitionsMap)));

      if (isUndefined(orQuery)) {
        return sqlTrue;
      }

      return not(orQuery);
    }

    const columnDef = assertDefinedPass(columnDefinitionsMap.get(property), `Could not map property ${property} to column.`);
    const column = table[columnDef.name as keyof PgTableFromType<string, EntityType>] as PgColumn;

    if (isPrimitiveValue || hasOwnProperty(value, '$eq')) {
      const queryValue = isPrimitiveValue ? value : (value as ComparisonEqualsQuery).$eq;

      if (queryValue === null) {
        return isNull(column);
      }

      return eq(column, queryValue);
    }

    if (hasOwnProperty(value, '$neq')) {
      const queryValue = (value as ComparisonNotEqualsQuery).$neq;

      if (queryValue === null) {
        return isNotNull(column);
      }

      return ne(column, queryValue);
    }

    if (hasOwnProperty(value, '$exists')) {
      throw new NotSupportedError('$exists is not supported.');
    }

    if (hasOwnProperty(value, '$in')) {
      const queryValue = (value as ComparisonInQuery).$in as any[];
      return inArray(column, queryValue);
    }

    if (hasOwnProperty(value, '$nin')) {
      const queryValue = (value as ComparisonNotInQuery).$nin as any[];
      return notInArray(column, queryValue);
    }

    if (hasOwnProperty(value, '$lt')) {
      const queryValue = (value as ComparisonLessThanQuery).$lt;
      return lt(column, queryValue);
    }

    if (hasOwnProperty(value, '$lte')) {
      const queryValue = (value as ComparisonLessThanOrEqualsQuery).$lte;
      return lte(column, queryValue);
    }

    if (hasOwnProperty(value, '$gt')) {
      const queryValue = (value as ComparisonGreaterThanQuery).$gt;
      return gt(column, queryValue);
    }

    if (hasOwnProperty(value, '$gte')) {
      const queryValue = (value as ComparisonGreaterThanOrEqualsQuery).$gte;
      return gte(column, queryValue);
    }

    if (hasOwnProperty(value, '$regex')) {
      const queryValue = (value as ComparisonRegexQuery).$regex;

      const regexp = isString(queryValue)
        ? ({ value: queryValue })
        : isRegExp(queryValue)
          ? ({ flags: queryValue.flags, value: queryValue.source })
          : ({ flags: queryValue.flags, value: queryValue.pattern });

      return sql`regexp_like(${column}, ${regexp.value}, ${regexp.flags})`;
    }

    if (hasOwnProperty(value, '$text')) {
      throw new NotSupportedError('$text is not supported.');
    }

    if (hasOwnProperty(value, '$geoShape')) {
      throw new NotSupportedError('$geoShape is not supported.');
    }

    if (hasOwnProperty(value, '$geoDistance')) {
      throw new NotSupportedError('$geoDistance is not supported.');
    }

    throw new Error(`Unsupported query type "${property}".`);
  }

  throw new Error('Unsupported query.');
}
