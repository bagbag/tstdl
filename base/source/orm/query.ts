import type { SQLWrapper } from 'drizzle-orm';

import type { Flatten, Record } from '#/types.js';
import type { Geometry } from '#/types/geo-json.js';
import type { UntaggedDeep } from '#/types/tagged.js';

export type LogicalQuery<T = any> = LogicalAndQuery<T> | LogicalOrQuery<T> | LogicalNorQuery<T>;
export type LogicalQueryTypes = keyof (LogicalAndQuery & LogicalOrQuery & LogicalNorQuery);
export const allLogicalQueryTypes: LogicalQueryTypes[] = ['$and', '$or', '$nor'];

export type ComparisonQueryBody<T = any> = { [P in keyof T]?: T[P] extends Record ? ComparisonQueryBody<T[P]> : ComparisonQueryOrValue<T[P]> } & Record<ComparisonQueryOrValue>;
export type ComparisonQueryOrValue<T = any> = ComparisonQuery<T> | ComparisonValue<T>;

export type ComparisonQuery<T = any> = Partial<
  & ComparisonNotQuery<T>
  & ComparisonEqualsQuery<T>
  & ComparisonNotEqualsQuery<T>
  & ComparisonExistsQuery
  & ComparisonItemQuery<T>
  & ComparisonInQuery<T>
  & ComparisonNotInQuery<T>
  & ComparisonAllQuery<T>
  & ComparisonGreaterThanQuery<T>
  & ComparisonGreaterThanOrEqualsQuery<T>
  & ComparisonLessThanQuery<T>
  & ComparisonLessThanOrEqualsQuery<T>
  & ComparisonRegexQuery
  & ComparisonTextQuery
  & ComparisonGeoShapeQuery
  & ComparisonGeoDistanceQuery
>;

export type ComparisonQueryTypes = keyof ComparisonQuery;
export const allComparisonQueryTypes: ComparisonQueryTypes[] = ['$all', '$not', '$eq', '$exists', '$gt', '$gte', '$in', '$item', '$lt', '$lte', '$neq', '$nin', '$regex', '$text', '$geoDistance', '$geoShape'];

export type SpecialQuery<T = any> = Partial<TextSpanQuery<T>>;
export type SpecialQueryTypes = keyof SpecialQuery;
export const allSpecialQueryTypes: SpecialQueryTypes[] = ['$textSpan'];

export type Query<T = any> = SQLWrapper | QueryObject<UntaggedDeep<T>>;

export type QueryObject<T> = LogicalQuery<T> | (ComparisonQueryBody<T> & SpecialQuery<T>);
export type QueryTypes = LogicalQueryTypes | ComparisonQueryTypes | SpecialQueryTypes;
export const allQueryTypes = [...allLogicalQueryTypes, ...allComparisonQueryTypes, ...allSpecialQueryTypes];

export type Operator = 'and' | 'or';
export const allOperators: Operator[] = ['and', 'or'];

export type LogicalAndQuery<T = any> = {
  $and: readonly Query<T>[]
};

export type LogicalOrQuery<T = any> = {
  $or: readonly Query<T>[]
};

export type LogicalNorQuery<T = any> = {
  $nor: readonly Query<T>[]
};

export type ComparisonValue<T> = T | Flatten<T> | SQLWrapper;
export type ComparisonValueWithRegex<T> = T extends string
  ? ComparisonValue<T | RegExp>
  : T extends readonly string[]
  ? ComparisonValue<readonly (Flatten<T> | RegExp)[]>
  : (T | Flatten<T>);

export type ComparisonNotQuery<T = any> = {
  $not: ComparisonQuery<T>
};

export type ComparisonEqualsQuery<T = any> = {
  $eq: ComparisonValueWithRegex<T>
};

export type ComparisonNotEqualsQuery<T = any> = {
  $neq: ComparisonValueWithRegex<T>
};

export type ComparisonExistsQuery = {
  $exists: ComparisonValue<boolean>
};

export type ComparisonItemQuery<T = any> = {
  $item: T extends readonly (infer U)[]
  ? U extends Record
  ? Query<U>
  : ComparisonQuery<U>
  : never
};

export type ComparisonInQuery<T = any> = {
  $in: readonly ComparisonValueWithRegex<T>[]
};

export type ComparisonNotInQuery<T = any> = {
  $nin: readonly ComparisonValueWithRegex<T>[]
};

export type ComparisonAllQuery<T = any> = {
  $all: readonly ComparisonValueWithRegex<T>[]
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

export type GeoShapeRelation = 'intersects' | 'within' | 'disjoint' | 'contains';

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
     * Maximum distance in meters
     */
    maxDistance?: number,

    /**
     * Minimum distance in meters
     */
    minDistance?: number
  }
};

export type TextSpanQueryMode = 'best' | 'most' | 'cross';
export const allTextSpanQueryModes: TextSpanQueryMode[] = ['best', 'most', 'cross'];

export type TextSpanQuery<T = any> = {
  $textSpan: {
    fields: readonly (Extract<keyof T, string>)[],
    text: string,
    mode?: TextSpanQueryMode,
    operator?: Operator
  }
};
