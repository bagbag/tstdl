import type { Entity } from '@tstdl/database';
import type { SearchQuery } from './query';
import type { SearchResult } from './search-result';

export interface SearchIndex<T extends Entity> {
  readonly _type: T;

  index(entities: T[]): Promise<void>;
  search(query: SearchQuery): Promise<SearchResult<T>>;
  drop(): Promise<void>;
}
