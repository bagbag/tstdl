import type { StringMap } from '@tstdl/base/types';

export type QueryOptions<T = any> = {
  sort?: Sort<T>[],
  skip?: number,
  limit?: number
};


export type Query<T = any> = SimpleQuery<T> | LogicalQuery<T> | ComparisonQueryBody<T> | ComplexQuery;

export type SimpleQuery<T = any> = { [P in keyof T]?: T[P] } & StringMap;

export type LogicalQuery<T = any> = LogicalAndQuery<T> | LogicalOrQuery<T> | LogicalNorQuery<T>;
export type LogicalQueryTypes = keyof (LogicalAndQuery & LogicalOrQuery & LogicalNorQuery);
export const allLogicalQueryTypes: LogicalQueryTypes[] = ['$and', '$or', '$nor'];

export type ComparisonQueryBody<T = any> = { [P in keyof T]?: ComparisonQuery<T[P]> } & StringMap<ComparisonQuery>;

export type ComparisonQuery<Value = any> = Partial<
  ComparisonEqualsQuery<Value>
  & ComparisonNotEqualsQuery<Value>
  & ComparisonInQuery<Value>
  & ComparisonNotInQuery<Value>
  & ComparisonGreaterThanQuery<Value>
  & ComparisonGreaterThanOrEqualsQuery<Value>
  & ComparisonLessThanQuery<Value>
  & ComparisonLessThanOrEqualsQuery<Value>
  & ComparisonRegexQuery
  & ComparisonTextQuery
>;
export type ComparisonQueryTypes = keyof ComparisonQuery;
export const allComparisonQueryTypes: ComparisonQueryTypes[] = ['$eq', '$gt', '$gte', '$in', '$lt', '$lte', '$neq', '$nin', '$regex', '$text'];

export type ComplexQuery<T = any> = Partial<ComplexTextSpanQuery<T>>;
export type ComplexQueryTypes = keyof ComplexQuery;
export const allComplexQueryTypes: ComplexQueryTypes[] = ['$textSpan'];

export type Order = 'asc' | 'desc';
export const allOrders: Order[] = ['asc', 'desc'];

export type Operator = 'and' | 'or';
export const allOperators: Operator[] = ['and', 'or'];

export type Sort<T = any> = {
  field: (keyof T | '$score'),
  order?: Order
};

export type LogicalAndQuery<T = any> = {
  $and: Query<T>[]
};

export type LogicalOrQuery<T = any> = {
  $or: Query<T>[]
};

export type LogicalNorQuery<T = any> = {
  $nor: Query<T>[]
};

export type ComparisonEqualsQuery<T = any> = {
  $eq: T
};

export type ComparisonNotEqualsQuery<T = any> = {
  $neq: T
};

export type ComparisonInQuery<T = any> = {
  $in: T[]
};

export type ComparisonNotInQuery<T = any> = {
  $nin: T[]
};

export type ComparisonGreaterThanQuery<T = any> = {
  $gt: T
};

export type ComparisonGreaterThanOrEqualsQuery<T = any> = {
  $gte: T
};

export type ComparisonLessThanQuery<T = any> = {
  $lt: T
};

export type ComparisonLessThanOrEqualsQuery<T = any> = {
  $lte: T
};

export type ComparisonRegexQuery = {
  $regex: string | RegExp
};

export type ComparisonTextQuery = {
  $text: string | { text: string, operator?: Operator }
};

export type ComplexTextSpanQueryMode = 'best' | 'most' | 'cross';
export const allComplexTextSpanQueryModes: ComplexTextSpanQueryMode[] = ['best', 'most', 'cross'];

export type ComplexTextSpanQuery<T = any> = {
  $textSpan: {
    fields: (Extract<keyof T, string>)[],
    text: string,
    mode?: ComplexTextSpanQueryMode,
    operator?: Operator
  }
};
