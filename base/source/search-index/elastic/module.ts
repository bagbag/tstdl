import { container, injectionToken } from '#/container/index.js';
import { connect, disposer } from '#/core.js';
import type { Entity } from '#/database/index.js';
import { Logger } from '#/logger/index.js';
import { assert, assertDefined, isArray, isObject, isString } from '#/utils/type-guards.js';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import type { ElasticSearchIndexConfigArgument } from './config.js';
import { ElasticSearchIndexConfig } from './config.js';

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

    const url = getUrl(options.node ?? options.nodes);
    await connect(`elasticsearch (${url})`, async () => client.ping().then((alive) => assert(alive, 'failed to connect')), logger);

    return client;
  }
}, { defaultArgumentProvider: () => elasticsearchModuleConfig.defaultOptions });

container.registerSingleton(ELASTIC_SEARCH_INDEX_CONFIG, {
  useFactory: (argument, context) => context.resolve(ElasticSearchIndexConfig, argument)
});

export function getElasticSearchIndexConfig<T extends Entity>(indexName: string): ElasticSearchIndexConfig<T> {
  return container.resolve(ElasticSearchIndexConfig, indexName);
}

function getUrl(node: ClientOptions['node']): string {
  if (isString(node)) {
    return node;
  }

  if (isArray(node)) {
    const urls = node.map(getUrl);
    return `[${urls.join(', ')}]`;
  }

  if (isObject(node)) {
    return node.url.toString();
  }

  return 'undefined url';
}
