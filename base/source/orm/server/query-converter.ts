/**
 * @module
 * Converts a generic query object structure into a Drizzle ORM SQL condition.
 * Supports logical operators ($and, $or, $nor) and various comparison operators
 * ($eq, $neq, $in, $nin, $lt, $lte, $gt, $gte, $regex).
 */
import { and, eq, gt, gte, inArray, isNotNull, isNull, isSQLWrapper, lt, lte, ne, not, notInArray, or, SQL, sql } from 'drizzle-orm';
import type { PgColumn } from 'drizzle-orm/pg-core';

import { NotSupportedError } from '#/errors/not-supported.error.js';
import type { Primitive, Record } from '#/types.js';
import { hasOwnProperty, objectEntries } from '#/utils/object/object.js';
import { assertDefinedPass, isPrimitive, isRegExp, isString, isUndefined } from '#/utils/type-guards.js';
import type { ComparisonEqualsQuery, ComparisonGreaterThanOrEqualsQuery, ComparisonGreaterThanQuery, ComparisonInQuery, ComparisonLessThanOrEqualsQuery, ComparisonLessThanQuery, ComparisonNotEqualsQuery, ComparisonNotInQuery, ComparisonRegexQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query } from '../query.js';
import type { ColumnDefinition, PgTableFromType } from './types.js';

const sqlTrue = sql`true`;

/**
 * Converts a query object into a Drizzle SQL condition.
 * Recursively handles nested logical operators and maps property names to database columns.
 * @param query The query object to convert. Can be a Drizzle SQL object, SQLWrapper, or a custom query object.
 * @param table The Drizzle table object.
 * @param columnDefinitionsMap A map from property names to column definitions.
 * @returns A Drizzle SQL condition representing the query.
 * @throws {Error} If multiple logical operators are used at the same level.
 * @throws {Error} If a property cannot be mapped to a column.
 * @throws {Error} If an unsupported query type is encountered.
 */
export function convertQuery(query: Query, table: PgTableFromType, columnDefinitionsMap: Map<string, ColumnDefinition>): SQL {
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

  const conditions: SQL[] = [];

  for (const [property, value] of queryEntries) {
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
    const column = table[columnDef.name as keyof PgTableFromType] as PgColumn;

    const condition = getCondition(property, value, column);
    conditions.push(condition);
  }

  return and(...conditions)!;
}

/**
 * Generates a Drizzle SQL condition based on a property, its value, and the corresponding column.
 * Handles various comparison operators.
 * @param property The property name (used for error messages).
 * @param value The value or comparison object for the property.
 * @param column The Drizzle column object.
 * @returns A Drizzle SQL condition.
 * @throws {NotSupportedError} If an unsupported operator like $exists, $text, $geoShape, or $geoDistance is used.
 * @throws {Error} If the value structure is not a recognized comparison operator.
 */
function getCondition(property: string, value: Primitive | Record, column: PgColumn): SQL {
  const isPrimitiveValue = isPrimitive(value);

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

  // $exists is not supported
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
