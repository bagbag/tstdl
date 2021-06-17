/* eslint-disable @typescript-eslint/semi */
import type { Client } from '@elastic/elasticsearch';
import type { Bulk } from '@elastic/elasticsearch/api/requestParams';
import type { Logger } from '@tstdl/base/logger';
import { TypedOmit } from '@tstdl/base/types';
import { isDefined } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import type { SearchIndex, SearchResult } from '@tstdl/search-index';
import type { SearchQuery } from '@tstdl/search-index/query';
import { QueryBuilder } from '@tstdl/search-index/query/builder';
import type { ElasticsearchIndexMapping, ElasticsearchIndexSettings } from './model';
import { QueryConverter } from './query-converter';
import { BoolQueryConvertHandler, IdsQueryConvertHandler, MatchAllQueryConvertHandler, RangeQueryConvertHandler, RegexQueryConvertHandler, SortConverter, TermQueryConvertHandler, TextQueryConvertHandler } from './query-converter/handlers';

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

  async search(searchQuery: SearchQuery): Promise<SearchResult<T>> {
    const queryConverter = new QueryConverter(new SortConverter());

    queryConverter.registerHandler(
      new TextQueryConvertHandler(),
      new IdsQueryConvertHandler(),
      new MatchAllQueryConvertHandler(),
      new RegexQueryConvertHandler(),
      new TermQueryConvertHandler(),
      new BoolQueryConvertHandler(queryConverter),
      new RangeQueryConvertHandler()
    );

    const query = queryConverter.convert(searchQuery, this.indexName);
    const response = await this.client.search(query) as { body: { hits: { hits: { _id: string, _source: TypedOmit<T, 'id'> }[], total: { value: number, relation: 'eq' | 'gte' } }, took: number } };

    const entities = response.body.hits.hits.map(({ _id, _source }): T => ({ id: _id, ..._source }) as T);
    const totalIsLowerBound = response.body.hits.total.relation == 'gte';

    const result: SearchResult<T> = { total: response.body.hits.total.value, milliseconds: response.body.took, totalIsLowerBound, entities };
    return result;
  }

  async drop(): Promise<void> {
    await this.client.indices.delete({ index: this.indexName });
  }
}
