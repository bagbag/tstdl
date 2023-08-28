import { connect } from '#/core.js';
import { inject } from '#/injector/inject.js';
import { Injector } from '#/injector/injector.js';
import { injectionToken } from '#/injector/token.js';
import { Logger } from '#/logger/logger.js';
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

export const ELASTIC_SEARCH_INDEX_CONFIG = injectionToken<ElasticSearchIndexConfig, ElasticSearchIndexConfigArgument>('ElasticSearchIndexConfig');

export function configureElasticsearch(config: Partial<ElasticsearchModuleConfig> = {}): void {
  elasticsearchModuleConfig.defaultOptions = config.defaultOptions ?? elasticsearchModuleConfig.defaultOptions;
  elasticsearchModuleConfig.logPrefix = config.logPrefix ?? elasticsearchModuleConfig.logPrefix;
}

Injector.registerSingleton<Client, ClientOptions, { logger: Logger }>(Client, {
  useFactory: (argument, context) => {
    assertDefined(argument, 'missing elasticsearch client options');

    context.data.logger = inject(Logger, elasticsearchModuleConfig.logPrefix);
    const client: Client = new Client(argument);

    context.addDisposeHandler(async () => client.close().then(() => context.data.logger.info('closed connection')));

    return client;
  },
  async afterResolve(client, options, { cancellationToken, data: { logger } }) {
    const url = getUrl(options.node ?? options.nodes);
    await connect(`elasticsearch (${url})`, async () => client.ping().then((alive) => assert(alive, 'failed to connect')), logger, cancellationToken);
  },
  defaultArgumentProvider() {
    return elasticsearchModuleConfig.defaultOptions;
  }
});

Injector.registerSingleton(ELASTIC_SEARCH_INDEX_CONFIG, {
  useFactory: (argument, context) => context.resolve(ElasticSearchIndexConfig, argument)
});

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
