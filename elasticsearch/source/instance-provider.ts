import type { ClientOptions } from '@elastic/elasticsearch';
import { Client } from '@elastic/elasticsearch';
import { disposer, getLogger } from '@tstdl/base/instance-provider';
import type { Logger } from '@tstdl/base/logger';
import type { Type } from '@tstdl/base/types';
import { assert, isDefined, singleton } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import { connect } from '@tstdl/server/instance-provider';
import type { ElasticSearchIndex } from './search-index';

type ElasticSearchIndexStatic<T extends Entity> = Type<ElasticSearchIndex<T>, [Client, string, Logger]>;

export type ElasticSearchIndexConfig<T extends Entity> = {
  indexName: string,
  type: T
};

const singletonScope = Symbol('singletons');

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

export async function getElasticClient(): Promise<Client> {
  return singleton(singletonScope, Client, async () => {
    const logger = getLogger(elasticLogPrefix);

    const client: Client = new Client(clientOptions);

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
    const logger = getLogger(searchIndexLogPrefix);
    const client = await getElasticClient();
    const searchIndex = new ctor(client, config.indexName, logger) as InstanceType<C>;

    await searchIndex.initialize();

    return searchIndex;
  });
}


export function getElasticSearchIndexConfig<T extends Entity>(indexName: string): ElasticSearchIndexConfig<T> {
  return { indexName, type: undefined as unknown as T };
}
