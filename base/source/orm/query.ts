/**
 * @module
 * Defines types for constructing database queries using a MongoDB-like syntax.
 * Supports logical operators, comparison operators, and specialized queries like text search and geospatial queries.
 */
import type { SQLWrapper } from 'drizzle-orm';

import type { Flatten, Record } from '#/types.js';
import type { Geometry } from '#/types/geo-json.js';
import type { UntaggedDeep } from '#/types/tagged.js';

/** Represents a logical query combining multiple sub-queries (e.g., $and, $or, $nor). */
export type LogicalQuery<T = any> = LogicalAndQuery<T> | LogicalOrQuery<T> | LogicalNorQuery<T>;

/** Union of keys representing logical query operators ('$and', '$or', '$nor'). */
export type LogicalQueryTypes = keyof (LogicalAndQuery & LogicalOrQuery & LogicalNorQuery);

/** Array containing all valid logical query operator keys. */
export const allLogicalQueryTypes: LogicalQueryTypes[] = ['$and', '$or', '$nor'];

/** Represents the body of a comparison query, mapping field paths to comparison operators or values. Allows nested structures. */
export type ComparisonQueryBody<T = any> = { [P in keyof T]?: T[P] extends Record ? ComparisonQueryBody<T[P]> : ComparisonQueryOrValue<T[P]> } & Record<ComparisonQueryOrValue>;

/** Represents either a full comparison query object or a direct value for equality comparison. */
export type ComparisonQueryOrValue<T = any> = ComparisonQuery<T> | ComparisonValue<T>;

/** Represents a comparison query using various operators like $eq, $ne, $gt, $in, etc. */
export type ComparisonQuery<T = any> = Partial<
  & ComparisonAndQuery<T>
  & ComparisonOrQuery<T>
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

/** Union of keys representing comparison query operators. */
export type ComparisonQueryTypes = keyof ComparisonQuery;

/** Array containing all valid comparison query operator keys. */
export const allComparisonQueryTypes: ComparisonQueryTypes[] = ['$all', '$not', '$eq', '$exists', '$gt', '$gte', '$in', '$item', '$lt', '$lte', '$neq', '$nin', '$regex', '$text', '$geoDistance', '$geoShape'];

/** Represents specialized query types beyond simple comparisons (e.g., $textSpan). */
export type SpecialQuery<T = any> = Partial<TextSpanQuery<T>>;

/** Union of keys representing special query operators. */
export type SpecialQueryTypes = keyof SpecialQuery;

/** Array containing all valid special query operator keys. */
export const allSpecialQueryTypes: SpecialQueryTypes[] = ['$textSpan'];

/**
 * Represents a complete query, which can be either a raw Drizzle SQLWrapper
 * or a structured query object using logical and comparison operators.
 * @template T - The type of the entity being queried.
 */
export type Query<T = any> = SQLWrapper | QueryObject<UntaggedDeep<T>>;

/** Represents a structured query object, combining logical, comparison, and special queries. */
export type QueryObject<T> = LogicalQuery<T> | (ComparisonQueryBody<T> & SpecialQuery<T>);

/** Union of all possible query operator keys (logical, comparison, special). */
export type QueryTypes = LogicalQueryTypes | ComparisonQueryTypes | SpecialQueryTypes;

/** Array containing all valid query operator keys. */
export const allQueryTypes = [...allLogicalQueryTypes, ...allComparisonQueryTypes, ...allSpecialQueryTypes];

/** Logical operators used within certain query types like $text. */
export type Operator = 'and' | 'or';

/** Array containing all valid logical operators ('and', 'or'). */
export const allOperators: Operator[] = ['and', 'or'];

/** Represents an AND logical query. All sub-queries must be true. */
export type LogicalAndQuery<T = any> = {
  $and: readonly Query<T>[],
};

/** Represents an OR logical query. At least one sub-query must be true. */
export type LogicalOrQuery<T = any> = {
  $or: readonly Query<T>[],
};

/** Represents a NOR logical query. All sub-queries must be false. */
export type LogicalNorQuery<T = any> = {
  $nor: readonly Query<T>[],
};

/** Represents a value used in comparisons, can be a direct value, a flattened value, or a Drizzle SQLWrapper. */
export type ComparisonValue<T> = T | Flatten<T> | SQLWrapper;

/** Represents a comparison value that can also include a RegExp for string comparisons. */
export type ComparisonValueWithRegex<T> = T extends string
  ? ComparisonValue<T | RegExp>
  : T extends readonly string[]
  ? ComparisonValue<readonly (Flatten<T> | RegExp)[]>
  : (T | Flatten<T>);

/** Represents a logical AND query. All sub-queries must be true. */
export type ComparisonAndQuery<T = any> = {
  $and: readonly ComparisonQueryOrValue<T>[],
};

/** Represents a logical OR query. At least one sub-query must be true. */
export type ComparisonOrQuery<T = any> = {
  $or: readonly ComparisonQueryOrValue<T>[],
};

/** Represents a NOT comparison query. Inverts the result of the nested comparison. */
export type ComparisonNotQuery<T = any> = {
  $not: ComparisonQueryOrValue<T>,
};

/** Represents an equality comparison query ($eq). */
export type ComparisonEqualsQuery<T = any> = {
  $eq: ComparisonValueWithRegex<T>,
};

/** Represents a non-equality comparison query ($neq). */
export type ComparisonNotEqualsQuery<T = any> = {
  $neq: ComparisonValueWithRegex<T>,
};

/** Represents an existence check query ($exists). Checks if a field exists (or not). */
export type ComparisonExistsQuery = {
  $exists: ComparisonValue<boolean>,
};

/** Represents a query targeting elements within an array field ($item). */
export type ComparisonItemQuery<T = any> = {
  $item: T extends readonly (infer U)[]
  ? U extends Record
  ? Query<U>
  : ComparisonQuery<U>
  : never,
};

/** Represents an "in list" comparison query ($in). Checks if a field value is within a specified array. */
export type ComparisonInQuery<T = any> = {
  $in: readonly ComparisonValueWithRegex<T>[],
};

/** Represents a "not in list" comparison query ($nin). Checks if a field value is not within a specified array. */
export type ComparisonNotInQuery<T = any> = {
  $nin: readonly ComparisonValueWithRegex<T>[],
};

/** Represents an "all elements match" query ($all). Checks if an array field contains all specified values. */
export type ComparisonAllQuery<T = any> = {
  $all: readonly ComparisonValueWithRegex<T>[],
};

/** Represents a "greater than" comparison query ($gt). */
export type ComparisonGreaterThanQuery<T = any> = {
  $gt: ComparisonValue<T>,
};

/** Represents a "greater than or equals" comparison query ($gte). */
export type ComparisonGreaterThanOrEqualsQuery<T = any> = {
  $gte: ComparisonValue<T>,
};

/** Represents a "less than" comparison query ($lt). */
export type ComparisonLessThanQuery<T = any> = {
  $lt: ComparisonValue<T>,
};

/** Represents a "less than or equals" comparison query ($lte). */
export type ComparisonLessThanOrEqualsQuery<T = any> = {
  $lte: ComparisonValue<T>,
};

/** Represents a regular expression comparison query ($regex). */
export type ComparisonRegexQuery = {
  $regex: string | RegExp | { pattern: string, flags: string },
};

/** Represents a full-text search query ($text). */
export type ComparisonTextQuery = {
  $text: string | { text: string, operator?: Operator },
};

/** Defines the possible spatial relationships for geospatial shape queries. */
export type GeoShapeRelation = 'intersects' | 'within' | 'disjoint' | 'contains';

/** Represents a geospatial query based on shape relationships ($geoShape). */
export type ComparisonGeoShapeQuery = {
  $geoShape: {
    geometry: Geometry,
    relation: GeoShapeRelation,
  },
};

/** Represents a geospatial query based on distance from a point ($geoDistance). */
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
    minDistance?: number,
  },
};

/** Defines the modes for text span queries, affecting how multiple field matches are handled. */
export type TextSpanQueryMode = 'best' | 'most' | 'cross';

/** Array containing all valid text span query modes. */
export const allTextSpanQueryModes: TextSpanQueryMode[] = ['best', 'most', 'cross'];

/** Represents a text span query ($textSpan), searching for text across multiple fields. */
export type TextSpanQuery<T = any> = {
  $textSpan: {
    fields: readonly (Extract<keyof T, string>)[],
    text: string,
    mode?: TextSpanQueryMode,
    operator?: Operator,
  },
};
