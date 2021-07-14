import type { Entity } from '#/database';
import type { Query, QueryOptions } from '#/database/query';
import type { SearchResult } from './search-result';

export interface SearchIndex<T extends Entity> {
  readonly _type: T;

  index(entities: T[]): Promise<void>;
  search(cursor: string, options?: QueryOptions<T>): Promise<SearchResult<T>>;
  search(query: Query<T>, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures
  search(queryOrCursor: Query<T> | string, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures
  drop(): Promise<void>;
}
