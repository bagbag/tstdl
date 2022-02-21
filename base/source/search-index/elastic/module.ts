import { container, injectionToken } from '#/container';
import { connect, disposer } from '#/core';
import type { Entity } from '#/database';
import { Logger } from '#/logger';
import { assert, assertDefined, assertStringPass } from '#/utils/type-guards';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import type { ElasticSearchIndexConfig } from './search-index';

export type ElasticsearchModuleConfig = {
  defaultOptions: ClientOptions,
  logPrefix: string
};

export const elasticsearchModuleConfig: ElasticsearchModuleConfig = {
  defaultOptions: { node: 'http://localhost:9200' },
  logPrefix: 'ELASTIC'
};

export type ElasticSearchIndexConfigArgument = string;

export const ELASTIC_SEARCH_INDEX_CONFIG = injectionToken<ElasticSearchIndexConfig<Entity>, ElasticSearchIndexConfigArgument>('ELASTIC_SEARCH_INDEX_CONFIG');

export function configureElasticsearch(config: Partial<ElasticsearchModuleConfig>): void {
  elasticsearchModuleConfig.defaultOptions = config.defaultOptions ?? elasticsearchModuleConfig.defaultOptions;
  elasticsearchModuleConfig.logPrefix = config.logPrefix ?? elasticsearchModuleConfig.logPrefix;
}

container.registerSingleton<Client, ClientOptions>(Client, {
  useAsyncFactory: async (options) => {
    assertDefined(options, 'missing elasticsearch client options');

    const logger = await container.resolveAsync(Logger, elasticsearchModuleConfig.logPrefix);

    const client: Client = new Client(options);

    disposer.add(async () => client.close().then(() => logger.info('closed connection')), 10000);

    await connect('elasticsearch', async () => client.ping().then((alive) => assert(alive, 'failed to connect')), logger);

    return client;
  }
}, { defaultArgumentProvider: () => elasticsearchModuleConfig.defaultOptions });


container.registerSingleton(ELASTIC_SEARCH_INDEX_CONFIG, {
  useFactory: (argument) => ({ indexName: assertStringPass(argument, 'resolve argument (index name) missing') })
});

export function getElasticSearchIndexConfig<T extends Entity>(indexName: string): ElasticSearchIndexConfig<T> {
  return { indexName };
}
