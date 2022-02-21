import type { AfterResolve } from '#/container';
import { afterResolve, container, injectionToken } from '#/container';
import type { Entity, Query, QueryOptions } from '#/database';
import { BadRequestError, MultiError } from '#/error';
import type { Logger } from '#/logger';
import type { SearchResult, SearchResultItem } from '#/search-index';
import { SearchIndex, SearchIndexError } from '#/search-index';
import { decodeBase64, encodeBase64 } from '#/utils/base64';
import { decodeText, encodeUtf8 } from '#/utils/encoding';
import { assertStringPass, isDefined, isNumber, isString } from '#/utils/type-guards';
import type { Client } from '@elastic/elasticsearch';
import type { BulkRequest, ErrorCause, IndicesIndexSettings, QueryDslQueryContainer, SearchRequest } from '@elastic/elasticsearch/lib/api/types';
import type { ElasticIndexMapping, SortCombinations } from './model';
import { convertQuery } from './query-converter';
import { convertSort } from './sort-converter';

declare const elasticSearchIndexConfigType: unique symbol;

export type ElasticSearchIndexConfig<T extends Entity> = {
  indexName: string,
  [elasticSearchIndexConfigType]?: T
};

export type ElasticSearchIndexConfigArgument = string;

export const ELASTIC_SEARCH_INDEX_CONFIG = injectionToken<ElasticSearchIndexConfig<Entity>, ElasticSearchIndexConfigArgument>('ELASTIC_SEARCH_INDEX_CONFIG');

type CursorData<T extends Entity = Entity> = {
  query: QueryDslQueryContainer,
  sort: SortCombinations<T>[] | undefined,
  options?: QueryOptions<T>,
  searchAfter: any
};

export class ElasticSearchIndex<T extends Entity> extends SearchIndex<T> implements AfterResolve {
  private readonly logger: Logger;

  readonly client: Client;
  readonly indexName: string;
  readonly indexSettings: IndicesIndexSettings;
  readonly indexMapping: ElasticIndexMapping<T>;
  readonly sortKeywordRewrites: Set<string>;

  constructor(client: Client, config: ElasticSearchIndexConfig<T>, indexSettings: IndicesIndexSettings, indexMapping: ElasticIndexMapping<T>, sortKeywordRewrites: Set<string>, logger: Logger) {
    super();

    this.client = client;
    this.indexName = config.indexName;
    this.indexSettings = indexSettings;
    this.indexMapping = indexMapping;
    this.sortKeywordRewrites = sortKeywordRewrites;
    this.logger = logger;
  }

  async [afterResolve](): Promise<void> {
    await this.initialize();
  }

  async initialize(): Promise<void> {
    const exists = await this.exists();

    if (!exists) {
      await this.client.indices.create({ index: this.indexName, mappings: this.indexMapping, settings: this.indexSettings });
      this.logger.info(`created index ${this.indexName}`);
    }
  }

  async refresh(): Promise<void> {
    await this.client.indices.refresh({ index: this.indexName });
  }

  async updateSettings(): Promise<void> {
    this.logger.info(`closing index ${this.indexName} for updates`);
    await this.client.indices.close({ index: this.indexName });
    this.logger.info(`closed index ${this.indexName} for updates`);

    this.logger.info(`updating settings for index ${this.indexName}`);
    await this.client.indices.putSettings({ index: this.indexName, body: this.indexSettings });
    this.logger.info(`updated settings for index ${this.indexName}`);

    this.logger.info(`updating mapping for index ${this.indexName}`);
    await this.client.indices.putMapping({ index: this.indexName, body: this.indexMapping });
    this.logger.info(`updated mapping for index ${this.indexName}`);

    this.logger.info(`reopening index ${this.indexName}`);
    await this.client.indices.open({ index: this.indexName });
    this.logger.info(`reopened index ${this.indexName}`);

    this.logger.info(`refreshing index ${this.indexName}`);
    await this.client.indices.refresh({ index: this.indexName });
    this.logger.info(`refreshed index ${this.indexName}`);
  }

  async index(entities: T[]): Promise<void> {
    const request: BulkRequest<T> = {
      index: this.indexName,
      refresh: false,
      operations: entities.flatMap((entity) => {
        const { id: _, ...entityWithoutId } = entity;
        return [{ index: { _id: entity.id } }, entityWithoutId];
      })
    };

    const result = await this.client.bulk(request);

    if (result.errors) {
      const errorItems = result.items
        .filter((item) => isDefined(item.index!.error))
        .map((item) => item.index!);

      const errors = errorItems.map((item) => convertError(item.error!, item));

      if (errors.length == 1) {
        throw errors[0]!;
      }

      const multiError = new MultiError(errors);
      throw new SearchIndexError('index error', 'multiple errors', { cause: multiError });
    }
  }

  async delete(id: string): Promise<void> {
    await this.client.delete({ index: this.indexName, id });
  }

  async deleteByQuery(query: Query<T>): Promise<void> {
    const queryBody = convertQuery(query);
    await this.client.deleteByQuery({ index: this.indexName, body: { query: queryBody } });
  }

  // eslint-disable-next-line max-statements
  async search(searchQueryOrCursor: Query<T> | string, options?: QueryOptions<T>): Promise<SearchResult<T>> {
    const cursorData = isString(searchQueryOrCursor) ? deserializeCursor(searchQueryOrCursor) : undefined;
    const queryBody = isDefined(cursorData) ? cursorData.query : convertQuery(searchQueryOrCursor as Query<T>);
    // eslint-disable-next-line @typescript-eslint/naming-convention
    const search: SearchRequest = { index: this.indexName, query: queryBody };

    if ((options?.skip ?? 0) + (options?.limit ?? 0) > 10000) {
      throw new BadRequestError(`Result window is too large, skip + limit must be less than or equal to ${this.indexSettings.max_result_window ?? 10000}. Use cursor for more results`);
    }

    if (isDefined(cursorData) && isDefined(options?.skip)) {
      throw new Error('cursor and skip cannot be used at the same time');
    }

    if (isDefined(cursorData) && isDefined(options?.sort)) {
      throw new Error('cursor and sort cannot be used at the same time');
    }

    const querySort = [...(options?.sort ?? [])];

    if (!querySort.some((item) => item.field == '$score')) {
      querySort.push({ field: '$score', order: 'desc' });
    }

    if (!querySort.some((item) => item.field == 'id')) {
      querySort.push({ field: 'id' as Extract<keyof T, string>, order: 'asc' });
    }

    const sort = cursorData?.sort ?? querySort.map((sortItem) => convertSort(sortItem, this.sortKeywordRewrites));

    search.sort = sort as string[];
    search.from = options?.skip;
    search.size = options?.limit ?? cursorData?.options?.limit;
    search.search_after = cursorData?.searchAfter;

    const response = await this.client.search<T>(search);

    const hits = response.hits.hits;
    const resultItems = hits.map(({ _id, _score, _source }): SearchResultItem<T> => ({ score: _score ?? 1, entity: { id: _id, ..._source } as T }));
    const total = isNumber(response.hits.total) ? response.hits.total : response.hits.total?.value;
    const totalIsLowerBound = isNumber(response.hits.total) ? false : (response.hits.total?.relation == 'gte');
    const cursor = (hits.length > 0) && (isDefined(hits[hits.length - 1]?.sort)) ? serializeCursor(queryBody, sort, { limit: search.size }, hits[hits.length - 1]!.sort) : undefined;

    const result: SearchResult<T> = { total, milliseconds: response.took, totalIsLowerBound, cursor, items: resultItems };
    return result;
  }

  async drop(): Promise<void> {
    const exists = await this.exists();

    if (!exists) {
      return;
    }

    await this.client.indices.delete({ index: this.indexName });
  }

  async exists(): Promise<boolean> {
    return this.client.indices.exists({ index: this.indexName });
  }
}

function serializeCursor<T extends Entity>(query: QueryDslQueryContainer, sort: SortCombinations[] | undefined, options: QueryOptions | undefined, searchAfterSort: any): string {
  const data: CursorData<T> = { query, sort, options, searchAfter: searchAfterSort };
  return encodeBase64(encodeUtf8(JSON.stringify(data)));
}

function deserializeCursor<T extends Entity>(cursor: string): CursorData<T> {
  return JSON.parse(decodeText(decodeBase64(cursor))) as CursorData<T>;
}

function convertError(error: ErrorCause, raw?: unknown): SearchIndexError {
  const cause = (isDefined(error.caused_by)) ? convertError(error.caused_by) : undefined;
  return new SearchIndexError(error.type, error.reason, { raw, cause });
}

container.registerSingleton(ELASTIC_SEARCH_INDEX_CONFIG, {
  useFactory: (argument) => ({ indexName: assertStringPass(argument, 'resolve argument (index name) missing') })
});
