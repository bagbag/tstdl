import { container, injectionToken } from '#/container';
import { connect, disposer } from '#/core';
import type { Entity } from '#/database';
import { Logger } from '#/logger';
import { assert, assertDefined } from '#/utils/type-guards';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import type { ElasticSearchIndexConfigArgument } from './config';
import { ElasticSearchIndexConfig } from './config';

export type ElasticsearchModuleConfig = {
  defaultOptions: ClientOptions,
  logPrefix: string
};

export const elasticsearchModuleConfig: ElasticsearchModuleConfig = {
  defaultOptions: { node: 'http://localhost:9200' },
  logPrefix: 'ELASTIC'
};

export const ELASTIC_SEARCH_INDEX_CONFIG = injectionToken<ElasticSearchIndexConfig, ElasticSearchIndexConfigArgument>('ELASTIC_SEARCH_INDEX_CONFIG');

export function configureElasticsearch(config: Partial<ElasticsearchModuleConfig> = {}): void {
  elasticsearchModuleConfig.defaultOptions = config.defaultOptions ?? elasticsearchModuleConfig.defaultOptions;
  elasticsearchModuleConfig.logPrefix = config.logPrefix ?? elasticsearchModuleConfig.logPrefix;
}

container.registerSingleton<Client, ClientOptions>(Client, {
  useFactory: async (options) => {
    assertDefined(options, 'missing elasticsearch client options');

    const logger = await container.resolveAsync(Logger, elasticsearchModuleConfig.logPrefix);

    const client: Client = new Client(options);

    disposer.add(async () => client.close().then(() => logger.info('closed connection')), 10000);

    await connect('elasticsearch', async () => client.ping().then((alive) => assert(alive, 'failed to connect')), logger);

    return client;
  }
}, { defaultArgumentProvider: () => elasticsearchModuleConfig.defaultOptions });

container.registerSingleton(ELASTIC_SEARCH_INDEX_CONFIG, {
  useFactory: (argument, context) => context.resolve(ElasticSearchIndexConfig, argument)
});

export function getElasticSearchIndexConfig<T extends Entity>(indexName: string): ElasticSearchIndexConfig<T> {
  return container.resolve(ElasticSearchIndexConfig, indexName);
}
