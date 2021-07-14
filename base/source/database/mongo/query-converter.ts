import type { Entity } from '#/database';
import type { ComparisonInQuery, ComparisonNotInQuery, ComparisonQueryTypes, ComparisonRegexQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, LogicalQueryTypes, Query, Sort } from '#/database/query';
import { allComparisonQueryTypes } from '#/database/query';
import { isDefined, isObject, isPrimitive, isString, isUndefined } from '#/utils';
import type { TransformerMappingMap } from './mongo-entity-repository';
import type { Filter, SortArrayItem } from './types';

// eslint-disable-next-line max-lines-per-function, max-statements
export function convertQuery<T extends Entity, TDb extends Entity>(query: Query<T>, mappingMap: TransformerMappingMap<T, TDb>, parentRawProperty?: string): Filter<TDb> {
  const filterQuery: Filter<any> = {};

  for (const [rawProperty, rawValue] of Object.entries(query)) {
    const mapping = mappingMap.get(rawProperty as keyof T);

    const property = isDefined(mapping) ? getPropertyName(mapping.key as string) : getPropertyName(rawProperty);
    const value = isDefined(mapping) ? mapping.transform(rawValue) : rawValue;

    const newProperty = getPropertyName(property);
    const isPrimitiveValue = isPrimitive(value);

    if (isPrimitiveValue) {
      filterQuery[newProperty] = value;
    }
    else if (property as LogicalQueryTypes == '$and') {
      filterQuery.$and = convertLogicalAndQuery(value, mappingMap);
    }
    else if (property as LogicalQueryTypes == '$or') {
      filterQuery.$or = convertLogicalOrQuery(value, mappingMap);
    }
    else if (property as LogicalQueryTypes == '$nor') {
      filterQuery.$nor = convertLogicalNorQuery(value, mappingMap);
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
      const innerMapping = mappingMap.get(parentRawProperty as keyof T);
      filterQuery['$in'] = isUndefined(innerMapping) ? value : (value as ComparisonInQuery).$in.map(innerMapping.transform);
    }
    else if (property as ComparisonQueryTypes == '$nin') {
      const innerMapping = mappingMap.get(parentRawProperty as keyof T);
      filterQuery['$nin'] = isUndefined(innerMapping) ? value : (value as ComparisonNotInQuery).$nin.map(innerMapping.transform);
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
  return property == 'id' ? '_id' : property;
}

export function convertLogicalAndQuery<T extends Entity>(andQuery: LogicalAndQuery<T>, mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return andQuery.$and.map((query) => convertQuery(query, mapping));
}

export function convertLogicalOrQuery<T extends Entity>(orQuery: LogicalOrQuery<T>, mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return orQuery.$or.map((query) => convertQuery(query, mapping));
}

export function convertLogicalNorQuery<T extends Entity>(norQuery: LogicalNorQuery<T>, mapping: TransformerMappingMap<T, any>): Filter<T>[] {
  return norQuery.$nor.map((query) => convertQuery(query, mapping));
}

export function convertSort<T extends Entity, TDb extends Entity>(sort: Sort<T>, mappingMap: TransformerMappingMap<T, TDb>): SortArrayItem<TDb> {
  const field = mappingMap.get(sort.field as keyof T)?.key ?? sort.field;
  return [field, sort.order == 'desc' ? -1 : 1] as SortArrayItem<TDb>;
}
