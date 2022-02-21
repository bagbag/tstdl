import type { Entity } from '#/database';

export type SearchResultItem<T extends Entity> = {
  entity: T,
  score: number
};

export type SearchResult<T extends Entity> = {
  total?: number,
  totalIsLowerBound: boolean,
  milliseconds: number,
  items: SearchResultItem<T>[],
  cursor?: string
};
