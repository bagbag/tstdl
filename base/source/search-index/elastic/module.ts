import { container } from '#/container';
import { connect, disposer } from '#/core';
import type { Entity } from '#/database';
import { Logger } from '#/logger';
import { assert, assertDefined, assertStringPass } from '#/utils/type-guards';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import type { ElasticSearchIndexConfig } from './search-index';
import { ELASTIC_SEARCH_INDEX_CONFIG } from './search-index';

export type ElasticsearchModuleConfig = {
  defaultOptions: ClientOptions,
  logPrefix: string
};

export const elasticsearchModuleConfig: ElasticsearchModuleConfig = {
  defaultOptions: { node: 'https://localhost:9200' },
  logPrefix: 'ELASTIC'
};

export function configureElasticsearch(config: Partial<ElasticsearchModuleConfig>): void {
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

export function getElasticSearchIndexConfig<T extends Entity>(config: ElasticSearchIndexConfig<T>): ElasticSearchIndexConfig<T> {
  return config;
}
