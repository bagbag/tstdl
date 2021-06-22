import { Client } from '@elastic/elasticsearch';
import { getCoreLogger } from '@tstdl/base/instance-provider';
import { Logger } from '@tstdl/base/logger';
import { isDefined } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import { configureElasticInstanceProvider, getElasticSearchIndex, getElasticSearchIndexConfig } from './instance-provider';
import type { ElasticIndexMapping, ElasticIndexSettings } from './model';
import { ElasticSearchIndex } from './search-index';

const logger = getCoreLogger();

type EntityType = Entity & {
  tag: string,
  channel: string
};

configureElasticInstanceProvider({
  clientOptions: {
    node: 'http://localhost:9200'
  }
});

export const elasticMapping: ElasticIndexMapping<any> = {
  properties: {
    id: {
      type: 'keyword',
      index: true
    },
    tag: {
      type: 'keyword',
      index: true
    },
    channel: {
      type: 'text',
      index: true,
      fields: {
        keyword: {
          type: 'keyword'
        }
      }
    }
  }
};

class EntityTypeElasticSearchIndex extends ElasticSearchIndex<EntityType> {
  constructor(client: Client, indexName: string, logger: Logger) {
    super(client, indexName, {}, elasticMapping, logger);
  }
}

// eslint-disable-next-line max-statements
async function test(): Promise<void> {
  const searchIndex = await getElasticSearchIndex(EntityTypeElasticSearchIndex, getElasticSearchIndexConfig('testindex'));

  await searchIndex.drop();
  await searchIndex.initialize();

  for (let i = 0; i < 50; i++) {
    const entities: EntityType[] = [];

    for (let j = i * 5000; j < (i * 5000) + 5000; j++) {
      entities.push({ id: `id${j}`, tag: `foobar${j}`, channel: `Hello World from here${j}` });
    }

    await searchIndex.index(entities);
    logger.info('indexed ' + 5000);
  }

  await searchIndex.refresh();

  const result = await searchIndex.search({ channel: { $text: 'Hello world' } }, { sort: [{ field: 'channel.keyword' as any, order: 'ascending' }, { field: 'id', order: 'ascending' }], limit: 5000 });

  let entities = result.entities;
  let cursor = result.cursor;

  while (isDefined(cursor)) {
    ({ entities, cursor } = await searchIndex.search(cursor));
    logger.info(entities.length.toString());
  }
}

void test().catch((error: Error) => console.error(error));
