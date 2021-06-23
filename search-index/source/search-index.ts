import type { Entity } from '@tstdl/database';
import type { Query, QueryOptions } from '@tstdl/database/query';
import type { SearchResult } from './search-result';

export interface SearchIndex<T extends Entity> {
  readonly _type: T;

  index(entities: T[]): Promise<void>;
  search(cursor: string, options?: QueryOptions<T>): Promise<SearchResult<T>>;
  search(query: Query<T>, options?: QueryOptions<T>): Promise<SearchResult<T>>;
  drop(): Promise<void>;
}
