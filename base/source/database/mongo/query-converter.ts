import type { Entity } from '#/database';
import type { ComparisonAllQuery, ComparisonInQuery, ComparisonNotInQuery, ComparisonQueryTypes, ComparisonRegexQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, LogicalQueryTypes, Query, Sort } from '#/database/query';
import { allComparisonQueryTypes } from '#/database/query';
import { isDefined, isObject, isPrimitive, isString, isUndefined } from '#/utils';
import type { TransformerMappingMap } from './mongo-entity-repository';
import type { Filter, SortArrayItem } from './types';

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertQuery<T extends Entity, TDb extends Entity>(query: Query<T>, mappingMap: TransformerMappingMap<T, TDb>, parentRawProperty?: string): Filter<TDb> {
  const filterQuery: Filter<any> = {};
  const innerMapping = mappingMap.get(parentRawProperty as keyof T);

  for (const [rawProperty, rawValue] of Object.entries(query)) {
    const mapping = mappingMap.get(rawProperty as keyof T);

    const property = isDefined(mapping) ? getPropertyName(mapping.key as string) : getPropertyName(rawProperty);
    const value = isDefined(mapping) ? mapping.transform(rawValue as T[keyof T]) : rawValue;

    const newProperty = getPropertyName(property);
    const isPrimitiveValue = isPrimitive(value);

    if (isPrimitiveValue) {
      filterQuery[newProperty] = value;
    }
    else if (property as LogicalQueryTypes == '$and') {
      filterQuery.$and = convertLogicalAndQuery(value as LogicalAndQuery<T>['$and'], mappingMap);
    }
    else if (property as LogicalQueryTypes == '$or') {
      filterQuery.$or = convertLogicalOrQuery(value as LogicalOrQuery<T>['$or'], mappingMap);
    }
    else if (property as LogicalQueryTypes == '$nor') {
      filterQuery.$nor = convertLogicalNorQuery(value as LogicalNorQuery<T>['$nor'], mappingMap);
    }
    else if (property as ComparisonQueryTypes == '$regex') {
      if (isString(value) || (value instanceof RegExp)) {
        filterQuery['$regex'] = value;
      }
      else {
        filterQuery['$regex'] = (value as Exclude<ComparisonRegexQuery['$regex'], string | RegExp>).pattern;
        filterQuery['$options'] = (value as Exclude<ComparisonRegexQuery['$regex'], string | RegExp>).flags;
      }
    }
    else if (property as ComparisonQueryTypes == '$in') {
      filterQuery['$in'] = isUndefined(innerMapping) ? value : (value as ComparisonInQuery).$in.map(innerMapping.transform);
    }
    else if (property as ComparisonQueryTypes == '$nin') {
      filterQuery['$nin'] = isUndefined(innerMapping) ? value : (value as ComparisonNotInQuery).$nin.map(innerMapping.transform);
    }
    else if (property as ComparisonQueryTypes == '$all') {
      filterQuery['$all'] = isUndefined(innerMapping) ? value : (value as ComparisonAllQuery).$all.map(innerMapping.transform);
    }
    else if (property as ComparisonQueryTypes == '$item') {
      filterQuery['$elemMatch'] = isObject(value) ? convertQuery(value, mappingMap, rawProperty) : value;
    }
    else if ((allComparisonQueryTypes as string[]).includes(property)) {
      filterQuery[newProperty] = value;
    }
    else if (isObject(value)) {
      filterQuery[newProperty] = convertQuery(value, mappingMap, rawProperty);
    }
    else {
      throw new Error(`unsupported query property ${property}`);
    }
  }

  return filterQuery;
}

function getPropertyName(property: string): string {
  return (property == 'id') ? '_id' : property;
}

export function convertLogicalAndQuery<T extends Entity>(ands: LogicalAndQuery<T>['$and'], mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return ands.map((query) => convertQuery(query, mapping));
}

export function convertLogicalOrQuery<T extends Entity>(ors: LogicalOrQuery<T>['$or'], mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return ors.map((query) => convertQuery(query, mapping));
}

export function convertLogicalNorQuery<T extends Entity>(nors: LogicalNorQuery<T>['$nor'], mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return nors.map((query) => convertQuery(query, mapping));
}

export function convertSort<T extends Entity, TDb extends Entity>(sort: Sort<T>, mappingMap: TransformerMappingMap<T, TDb>): SortArrayItem<TDb> {
  const field = mappingMap.get(sort.field as keyof T)?.key ?? sort.field;
  return [field, sort.order == 'desc' ? -1 : 1] as SortArrayItem<TDb>;
}
