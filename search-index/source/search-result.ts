export type SearchResultItem<T> = {
  entity: T,
  score: number
};

export type SearchResult<T> = {
  total: number,
  totalIsLowerBound: boolean,
  milliseconds: number,
  items: SearchResultItem<T>[],
  cursor?: string
};
