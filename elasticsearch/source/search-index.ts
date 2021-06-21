/* eslint-disable @typescript-eslint/semi */
import type { Client } from '@elastic/elasticsearch';
import type { Bulk, Search } from '@elastic/elasticsearch/api/requestParams';
import type { QueryContainer, Sort as ElasticsearchSort } from '@elastic/elasticsearch/api/types';
import type { Logger } from '@tstdl/base/logger';
import type { TypedOmit } from '@tstdl/base/types';
import { isDefined, isString } from '@tstdl/base/utils';
import type { Entity, Query, QueryOptions } from '@tstdl/database';
import type { SearchIndex, SearchResult } from '@tstdl/search-index';
import type { ElasticsearchIndexMapping, ElasticsearchIndexSettings } from './model';
import { convertQuery } from './query-converter';
import { convertSort } from './sort-converter';

type CursorData<T> = {
  query: QueryContainer,
  sort: ElasticsearchSort | undefined,
  options?: QueryOptions<T>,
  searchAfter: any
};

export class ElasticsearchSearchIndex<T extends Entity> implements SearchIndex<T> {
  private readonly logger: Logger;

  readonly _type: T;

  readonly client: Client;
  readonly indexName: string;
  readonly indexSettings: ElasticsearchIndexSettings;
  readonly indexMapping: ElasticsearchIndexMapping<T>;

  constructor(client: Client, indexName: string, indexSettings: ElasticsearchIndexSettings, indexMapping: ElasticsearchIndexMapping<T>, logger: Logger) {
    this.client = client;
    this.indexName = indexName;
    this.indexSettings = indexSettings;
    this.indexMapping = indexMapping;
    this.logger = logger;
  }

  async initialize(): Promise<void> {
    const { body: exists } = await this.client.indices.exists({ index: this.indexName });

    if (!exists) {
      await this.client.indices.create({ index: this.indexName, body: { mappings: this.indexMapping, settings: this.indexSettings } });
      this.logger.info(`created index ${this.indexName}`);
    }
  }

  async refresh(): Promise<void> {
    await this.client.indices.refresh({ index: this.indexName });
  }

  // eslint-disable-next-line max-statements
  async updateSettings({ settings, mapping }: { settings: ElasticsearchIndexSettings, mapping: ElasticsearchIndexMapping }): Promise<void> {
    const setSettings = isDefined(settings)
    const setMapping = isDefined(mapping);

    if (setSettings || setMapping) {
      this.logger.info(`closing index ${this.indexName} for updates`);
      await this.client.indices.close({ index: this.indexName });
      this.logger.info(`closed index ${this.indexName} for updates`);
    }

    if (setSettings) {
      this.logger.info(`updating settings for index ${this.indexName}`);
      await this.client.indices.putSettings({ index: this.indexName, body: this.indexSettings });
      this.logger.info(`updated settings for index ${this.indexName}`);
    }

    if (setMapping) {
      this.logger.info(`updating mapping for index ${this.indexName}`);
      await this.client.indices.putMapping({ index: this.indexName, body: this.indexMapping });
      this.logger.info(`updated mapping for index ${this.indexName}`);
    }

    if (setSettings || setMapping) {
      this.logger.info(`reopening index ${this.indexName}`);
      await this.client.indices.open({ index: this.indexName });
      this.logger.info(`reopened index ${this.indexName}`);

      this.logger.info(`refreshing index ${this.indexName}`);
      await this.client.indices.refresh({ index: this.indexName });
      this.logger.info(`refreshed index ${this.indexName}`);
    }
  }

  async index(entities: T[]): Promise<void> {
    const request: Bulk = {
      index: this.indexName,
      refresh: false,
      body: entities.flatMap((entity) => {
        const { id, ...entityWithoutId } = entity;
        return [{ index: { _id: entity.id } }, entityWithoutId];
      })
    };

    await this.client.bulk(request);
  }

  // eslint-disable-next-line max-statements
  async search(searchQueryOrCursor: Query<T> | string, options?: QueryOptions<T>): Promise<SearchResult<T>> {
    const cursorData = isString(searchQueryOrCursor) ? deserializeCursor(searchQueryOrCursor) : undefined;
    const queryBody = isDefined(cursorData) ? cursorData.query : convertQuery(searchQueryOrCursor as Query<T>);
    const search: Search<{ query: QueryContainer, search_after: any }> = { index: this.indexName, body: { query: queryBody } };

    if (isDefined(cursorData) && isDefined(options?.skip)) {
      throw new Error('cursor and skip cannot be used at the same time');
    }

    const sort: ElasticsearchSort | undefined = cursorData?.sort ?? options?.sort?.map(convertSort);

    (search.sort as ElasticsearchSort | undefined) = sort;
    search.from = options?.skip;
    search.size = options?.limit ?? cursorData?.options?.limit;
    search.body!.search_after = cursorData?.searchAfter;

    const response = await this.client.search(search) as { body: { hits: { hits: { _id: string, _source: TypedOmit<T, 'id'>, sort: any }[], total: { value: number, relation: 'eq' | 'gte' } }, took: number } };
    const hits = response.body.hits.hits;

    const entities = hits.map(({ _id, _source }): T => ({ id: _id, ..._source }) as T);
    const totalIsLowerBound = response.body.hits.total.relation == 'gte';
    const cursor = (hits.length > 0) && (isDefined(hits[hits.length - 1]?.sort)) ? serializeCursor(queryBody, sort, { limit: search.size }, hits[hits.length - 1]!.sort) : undefined;

    const result: SearchResult<T> = { total: response.body.hits.total.value, milliseconds: response.body.took, totalIsLowerBound, entities, cursor };

    return result;
  }

  async drop(): Promise<void> {
    await this.client.indices.delete({ index: this.indexName });
  }

  async exists(): Promise<boolean> {
    const response = await this.client.indices.exists({ index: this.indexName });
    return response.body;
  }
}

function serializeCursor<T extends Entity>(query: Query<T>, sort: ElasticsearchSort | undefined, options: QueryOptions | undefined, searchAfterSort: any): string {
  const data: CursorData<T> = { query, sort, options, searchAfter: searchAfterSort };
  return Buffer.from((JSON.stringify(data))).toString('base64');
}

function deserializeCursor<T extends Entity>(cursor: string): CursorData<T> {
  return JSON.parse(Buffer.from(cursor, 'base64').toString('utf8'));
}
