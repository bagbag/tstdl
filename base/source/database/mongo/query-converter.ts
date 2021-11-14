import type { Entity, QueryTypes } from '#/database';
import { allQueryTypes } from '#/database';
import type { ComparisonAllQuery, ComparisonInQuery, ComparisonNotInQuery, ComparisonRegexQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query, Sort } from '#/database/query';
import { assertDefinedPass, isDefined, isObject, isPrimitive, isRegExp, isString } from '#/utils';
import type { MappingItemTransformer, TransformerMappingMap } from './mongo-entity-repository';
import type { Filter, SortArrayItem } from './types';

const operatorsSet = new Set(allQueryTypes);

export function convertQuery<T extends Entity, TDb extends Entity>(query: Query<T>, mappingMap: TransformerMappingMap = new Map(), transform?: MappingItemTransformer): Filter<TDb> {
  let filterQuery: Filter<any> = {};
  const entries = Object.entries(query);

  for (const [property, value] of (entries as unknown as [QueryTypes, any][])) {
    const mapping = mappingMap.get(property);

    switch (property) {
      case '$and':
        filterQuery.$and = (value as LogicalAndQuery['$and']).map((innerQuery) => convertQuery(innerQuery as Query<T>, mappingMap, transform));
        break;

      case '$or':
        filterQuery.$or = (value as LogicalOrQuery['$or']).map((innerQuery) => convertQuery(innerQuery as Query<T>, mappingMap, transform));
        break;

      case '$nor':
        filterQuery.$nor = (value as LogicalNorQuery['$nor']).map((innerQuery) => convertQuery(innerQuery as Query<T>, mappingMap, transform));
        break;

      default:
        if (operatorsSet.has(property)) {
          const operatorQuery = (convertOperator(property, value, mapping?.transform ?? transform, mappingMap) as Filter<any>);
          filterQuery = { ...filterQuery, ...operatorQuery };
        }
        else {
          const mappedPropertyName = getPropertyName((mapping?.key as string | undefined) ?? property);
          filterQuery[mappedPropertyName] = convertInnerQuery(value, mapping?.transform ?? transform, mappingMap);
        }
    }
  }

  return filterQuery;
}

function getPropertyName(property: string): string {
  return (property == 'id') ? '_id' : property;
}

function convertInnerQuery(query: object, transform?: MappingItemTransformer, mapping?: TransformerMappingMap): any {
  if (isPrimitive(query)) {
    return transform?.(query) ?? query;
  }

  const queryEntries = Object.entries(query) as [QueryTypes, any][];

  if (queryEntries.length > 1) {
    const operators = queryEntries.map((entry) => entry[0]);
    throw new Error(`only one operator allowed but got ${JSON.stringify(operators)}`);
  }

  const [operator, value] = assertDefinedPass(queryEntries[0], 'missing query body');

  return convertOperator(operator, value, transform, mapping);
}

// eslint-disable-next-line complexity
function convertOperator(operator: QueryTypes, value: any, transform?: MappingItemTransformer, mapping?: TransformerMappingMap): any {
  switch (operator) {
    case '$eq':
    case '$not':
    case '$exists':
    case '$gt':
    case '$gte':
    case '$lt':
    case '$lte':
      return { [operator]: convertInnerQuery(value, transform) };

    case '$neq':
      return { $ne: convertInnerQuery(value, transform) };

    case '$in':
      return { $in: isDefined(transform) ? (value as ComparisonInQuery['$in']).map(transform) : value };

    case '$nin':
      return { $nin: isDefined(transform) ? (value as ComparisonNotInQuery['$nin']).map(transform) : value };

    case '$all':
      return { $all: isDefined(transform) ? (value as ComparisonAllQuery['$all']).map(transform) : value };

    case '$item':
      return { $elemMatch: isObject(value) ? convertQuery(value, mapping, transform) : transform?.(value) ?? value };

    case '$regex':
      if (isString(value) || isRegExp(value)) {
        return { $regex: value };
      }

      return {
        $regex: (value as Exclude<ComparisonRegexQuery['$regex'], string | RegExp>).pattern,
        $options: (value as Exclude<ComparisonRegexQuery['$regex'], string | RegExp>).flags
      };

    default: throw new Error(`unsupported inner-operator ${operator}`);
  }
}

export function convertSort<T extends Entity, TDb extends Entity>(sort: Sort<T>, mappingMap: TransformerMappingMap<T, TDb>): SortArrayItem<TDb> {
  const field = mappingMap.get(sort.field as keyof T)?.key ?? sort.field;
  return [field, sort.order == 'desc' ? -1 : 1] as SortArrayItem<TDb>;
}
