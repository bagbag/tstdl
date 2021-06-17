export type SearchResult<T> = {
  total: number,
  totalIsLowerBound: boolean,
  milliseconds: number,
  entities: T[],
  cursor?: string
};
