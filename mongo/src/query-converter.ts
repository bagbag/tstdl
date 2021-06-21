import { isPrimitive } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import type { LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query } from '@tstdl/database/query';
import { allComparisonQueryTypes } from '@tstdl/database/query';
import type { FilterQuery } from './types';

export function convertQuery<T extends Entity>(query: Query<T>): FilterQuery<T> {
  const filterQuery: FilterQuery<any> = {};

  for (const [property, value] of Object.entries(query)) {
    const newProperty = getPropertyName(property);
    const isPrimitiveValue = isPrimitive(value);

    if (isPrimitiveValue) {
      filterQuery[newProperty] = value;
    }
    else if (property == '$and') {
      filterQuery.$and = convertLogicalAndQuery(value);
    }
    else if (property == '$or') {
      filterQuery.$or = convertLogicalOrQuery(value);
    }
    else if (property == '$nor') {
      filterQuery.$nor = convertLogicalNorQuery(value);
    }
    else if ((allComparisonQueryTypes as string[]).includes(property)) {
      filterQuery[newProperty] = value;
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

export function convertLogicalAndQuery<T extends Entity>(andQuery: LogicalAndQuery<T>): FilterQuery<T>[] {
  return andQuery.$and.map(convertQuery);
}

export function convertLogicalOrQuery<T extends Entity>(orQuery: LogicalOrQuery<T>): FilterQuery<T>[] {
  return orQuery.$or.map(convertQuery);
}

export function convertLogicalNorQuery<T extends Entity>(norQuery: LogicalNorQuery<T>): FilterQuery<T>[] {
  return norQuery.$nor.map(convertQuery);
}
