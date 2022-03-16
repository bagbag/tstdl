import type { Entity } from '#/database';
import type { Query, QueryOptions } from '#/database/query';
import { isDefined } from '#/utils/type-guards';
import type { SearchResult, SearchResultItem } from './search-result';

export type SearchCursorOptions<T extends Entity> = QueryOptions<T> & {
  batchSize?: number
};

declare const type: unique symbol;

export abstract class SearchIndex<T extends Entity> {
  readonly [type]: T;

  /**
   * search all entities using an automatic cursor
   * @param query search query
   * @param options search options
   */
  async *searchCursor(query: Query<T>, options?: SearchCursorOptions<T>): AsyncIterable<SearchResultItem<T>> {
    let cursor: string | undefined;

    do {
      const result = await this.search(query, options);
      cursor = result.cursor;

      yield* result.items;
    }
    while (isDefined(cursor));
  }

  /**
   * search all entities instead of just a chunk
   * @param query search query
   * @param options search option
   */
  async searchAll(query: Query<T>, options?: QueryOptions<T>): Promise<SearchResultItem<T>[]> {
    const batches: SearchResultItem<T>[][] = [];
    let cursor: string | undefined;

    do {
      const result = await this.search(query, options);
      cursor = result.cursor;

      batches.push(result.items);
    }
    while (isDefined(cursor));

    return ([] as SearchResultItem<T>[]).concat(...batches);
  }

  /**
   * index entities for search
   * @param entities entities to index
   */
  abstract index(entities: T[]): Promise<void>;

  /**
   * delete entity from index
   * @param id entity id to delete
   */
  abstract delete(id: string): Promise<void>;

  /**
   * delete matching entities from index
   * @param query query to search for matching entities
   */
  abstract deleteByQuery(query: Query<T>): Promise<void>;

  abstract search(query: Query<T>, options?: QueryOptions<T>): Promise<SearchResult<T>>;
  abstract search(cursor: string, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures
  abstract search(queryOrCursor: Query<T> | string, options?: QueryOptions<T>): Promise<SearchResult<T>>; // eslint-disable-line @typescript-eslint/unified-signatures

  /**
   * drop index. If you only want to delete all items from the index, use {@link deleteByQuery} with an empty query.
   */
  abstract drop(): Promise<void>;
}
