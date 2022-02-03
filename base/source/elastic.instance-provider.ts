import type { Entity } from '#/database';
import { Logger } from '#/logger';
import type { Type } from '#/types';
import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { container } from './container';
import { connect, disposer } from './core';
import type { ElasticSearchIndex, ElasticSearchIndexConfig } from './search-index/elastic/search-index';
import { ELASTIC_SEARCH_INDEX_CONFIG } from './search-index/elastic/search-index';
import { singleton } from './utils/singleton';
import { assert, isDefined } from './utils/type-guards';

type ElasticSearchIndexStatic<T extends Entity> = Type<ElasticSearchIndex<T>, [Client, ElasticSearchIndexConfig<T>, Logger]>;

const singletonScope = Symbol('singletons');
const clientSingletonScope = Symbol('client singletons');

let clientOptions: ClientOptions = {};

let elasticLogPrefix = 'ELASTIC';

let searchIndexLogPrefix = 'SEARCH-INDEX';

export function configureElasticInstanceProvider(
  options: {
    clientOptions?: ClientOptions,
    elasticLogPrefix?: string,
    searchIndexLogPrefix?: string
  }
): void {
  if (isDefined(options.clientOptions)) {
    clientOptions = options.clientOptions;
  }

  if (isDefined(options.elasticLogPrefix)) {
    elasticLogPrefix = options.elasticLogPrefix;
  }

  if (isDefined(options.searchIndexLogPrefix)) {
    searchIndexLogPrefix = options.searchIndexLogPrefix;
  }
}

export async function getElasticClient(options: ClientOptions = clientOptions): Promise<Client> {
  return singleton(clientSingletonScope, options, async () => {
    const logger = await container.resolveAsync(Logger, elasticLogPrefix);

    const client: Client = new Client(options);

    client.on('resurrect', (_, event) => logger.info(
      event.isAlive
        ? `resurrected connection ${event.connection.id} (${event.connection.url.toString()})`
        : `failed to resurrect connection ${event.connection.id} (${event.connection.url.toString()})`
    ));

    disposer.add(async () => client.close().then(() => logger.info('closed connection')));

    await connect('elasticsearch', async () => client.ping().then(({ body: alive }) => assert(alive, 'failed to connect')), logger);

    return client;
  });
}

export async function getElasticSearchIndex<T extends Entity, C extends ElasticSearchIndexStatic<T> = ElasticSearchIndexStatic<T>>(ctor: C, config: ElasticSearchIndexConfig<T>): Promise<InstanceType<C>> {
  return singleton(singletonScope, ctor, async () => {
    const logger = await container.resolveAsync(Logger, searchIndexLogPrefix);
    const client = await getElasticClient();
    const searchIndex = new ctor(client, config, logger) as InstanceType<C>;

    await searchIndex.initialize();

    return searchIndex;
  });
}

export function getElasticSearchIndexConfig<T extends Entity>(indexName: string): ElasticSearchIndexConfig<T> {
  return container.resolve(ELASTIC_SEARCH_INDEX_CONFIG, indexName) as ElasticSearchIndexConfig<T>;
}

container.registerSingleton<Client, ClientOptions>(Client, {
  useAsyncFactory: async (options) => getElasticClient(options)
}, { defaultArgumentProvider: () => clientOptions });
