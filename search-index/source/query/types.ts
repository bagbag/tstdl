export type Aggregation = 'min' | 'max' | 'sum' | 'average' | 'median' | 'length';
export const allAggregations: Aggregation[] = ['min', 'max', 'sum', 'average', 'median', 'length'];

export type Order = 'ascending' | 'descending';
export const allOrders: Order[] = ['ascending', 'descending'];

export type Operator = 'and' | 'or';
export const allOperators: Operator[] = ['and', 'or'];

export type Sort<Field extends string = string> = {
  field: Field,
  order: Order,
  aggregation?: Aggregation
};

export type Query = Partial<TermQuery & IdsQuery & MatchAllQuery & BoolQuery & RangeQuery & TextQuery & RegexQuery>;

export type QueryOptions = {
  sort?: Sort[],
  skip?: number,
  limit?: number,
  cursor?: string
};

export type SearchQuery = QueryOptions & {
  query: Query
};

export type TermQueryValue = string | number | boolean;

export type TermQuery<Field extends string = string> = {
  term: {
    field: Field,
    value: TermQueryValue
  }
};

export type IdsQuery = {
  ids: string[]
};

export type MatchAllQuery = {
  matchAll: {} // eslint-disable-line @typescript-eslint/ban-types
};

export type BoolQuery = {
  bool: {
    must?: Query[],
    should?: Query[],
    not?: Query[],
    filter?: Query[]
  }
};

export type RangeQuery<Field extends string = string> = {
  range: {
    field: Field,
    lt?: number,
    lte?: number,
    gt?: number,
    gte?: number
  }
};

export type TextQuery<Field extends string = string> = {
  text: {
    fields: Field[],
    text: string,
    operator: Operator
  }
};

export type RegexQuery<Field extends string = string> = {
  regex: {
    field: Field,
    expression: string
  }
};
