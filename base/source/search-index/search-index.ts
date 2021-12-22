import type { Entity } from '#/database';
import type { Query, QueryOptions } from '#/database/query';
import type { SearchResult } from './search-result';

declare const type: unique symbol;

export abstract class SearchIndex<T extends Entity> {
  readonly [type]: T;

  abstract index(entities: T[]): Promise<void>;

  abstract delete(id: string): Promise<void>;
  abstract deleteByQuery(query: Query<T>): Promise<void>;

  abstract search(query: Query<T>, options?: QueryOptions<T>): Promise<SearchResult<T>>;
  abstract search(cursor: string, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures
  abstract search(queryOrCursor: Query<T> | string, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures

  abstract drop(): Promise<void>;
}
