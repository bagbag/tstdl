import type { Flatten, StringMap } from '#/types';
import type { Geometry } from '#/types/geo-json';
import type { Entity } from './entity';

export type QueryOptions<T extends Entity = Entity> = {
  sort?: Sort<T>[],
  skip?: number,
  limit?: number
};

export type Query<T extends Entity = Entity> = LogicalQuery<T> | (ComparisonQueryBody<T> & SpecialQuery<T>);

export type LogicalQuery<T extends Entity = Entity> = LogicalAndQuery<T> | LogicalOrQuery<T> | LogicalNorQuery<T>;
export type LogicalQueryTypes = keyof (LogicalAndQuery & LogicalOrQuery & LogicalNorQuery);
export const allLogicalQueryTypes: LogicalQueryTypes[] = ['$and', '$or', '$nor'];

export type ComparisonQueryBody<T extends Entity = Entity> = { [P in keyof T]?: ComparisonQuery<T[P]> } & StringMap<ComparisonQuery>;

export type ComparisonQuery<Value = any> = Value | Partial<
  ComparisonEqualsQuery<Value>
  & ComparisonNotEqualsQuery<Value>
  & ComparisonInQuery<Value>
  & ComparisonNotInQuery<Value>
  & ComparisonAllQuery<Value>
  & ComparisonGreaterThanQuery<Value>
  & ComparisonGreaterThanOrEqualsQuery<Value>
  & ComparisonLessThanQuery<Value>
  & ComparisonLessThanOrEqualsQuery<Value>
  & ComparisonRegexQuery
  & ComparisonTextQuery
  & ComparisonGeoShapeQuery
  & ComparisonGeoDistanceQuery
>;
export type ComparisonQueryTypes = keyof ComparisonQuery;
export const allComparisonQueryTypes: ComparisonQueryTypes[] = ['$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$neq', '$nin', '$regex', '$text'];

export type SpecialQuery<T extends Entity = Entity> = Partial<TextSpanQuery<T>>;
export type SpecialQueryTypes = keyof SpecialQuery;
export const allSpecialQueryTypes: SpecialQueryTypes[] = ['$textSpan'];

export type Order = 'asc' | 'desc';
export const allOrders: Order[] = ['asc', 'desc'];

export type Operator = 'and' | 'or';
export const allOperators: Operator[] = ['and', 'or'];

export type Sort<T extends Entity = Entity> = {
  field: (Extract<keyof T, string> | '$score'),
  order?: Order
};

export type LogicalAndQuery<T extends Entity = Entity> = {
  $and: Query<T>[]
};

export type LogicalOrQuery<T extends Entity = Entity> = {
  $or: Query<T>[]
};

export type LogicalNorQuery<T extends Entity = Entity> = {
  $nor: Query<T>[]
};

export type ComparisonValue<T> = T | Flatten<T>;
export type ComparisonValueWithRegex<T> = T extends string
  ? ComparisonValue<T | RegExp>
  : T extends string[]
  ? ComparisonValue<(Flatten<T> | RegExp)[]>
  : (T | Flatten<T>);

export type ComparisonEqualsQuery<T = any> = {
  $eq: ComparisonValueWithRegex<T>
};

export type ComparisonNotEqualsQuery<T = any> = {
  $neq: ComparisonValueWithRegex<T>
};

export type ComparisonInQuery<T = any> = {
  $in: ComparisonValueWithRegex<T>[]
};

export type ComparisonNotInQuery<T = any> = {
  $nin: ComparisonValueWithRegex<T>[]
};

export type ComparisonAllQuery<T = any> = {
  $all: ComparisonValueWithRegex<T>[]
};

export type ComparisonGreaterThanQuery<T = any> = {
  $gt: ComparisonValue<T>
};

export type ComparisonGreaterThanOrEqualsQuery<T = any> = {
  $gte: ComparisonValue<T>
};

export type ComparisonLessThanQuery<T = any> = {
  $lt: ComparisonValue<T>
};

export type ComparisonLessThanOrEqualsQuery<T = any> = {
  $lte: ComparisonValue<T>
};

export type ComparisonRegexQuery = {
  $regex: string | RegExp | { pattern: string, flags: string }
};

export type ComparisonTextQuery = {
  $text: string | { text: string, operator?: Operator }
};

export type GeoShapeRelation = 'intersect' | 'within' | 'disjoint' | 'contains';

export type ComparisonGeoShapeQuery = {
  $geoShape: {
    geometry: Geometry,
    relation: GeoShapeRelation
  }
};

export type ComparisonGeoDistanceQuery = {
  $geoDistance: {
    longitude: number,
    latitude: number,
    /**
     * maximum distance in meters
     */
    maxDistance?: number,
    /**
     * minimum distance in meters
     */
    minDistance?: number
  }
};

export type TextSpanQueryMode = 'best' | 'most' | 'cross';
export const allTextSpanQueryModes: TextSpanQueryMode[] = ['best', 'most', 'cross'];

export type TextSpanQuery<T extends Entity = Entity> = {
  $textSpan: {
    fields: (Extract<keyof T, string>)[],
    text: string,
    mode?: TextSpanQueryMode,
    operator?: Operator
  }
};
