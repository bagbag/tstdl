import { Client } from '@elastic/elasticsearch';
import { getCoreLogger } from '@tstdl/base/instance-provider';
import { isDefined } from '@tstdl/base/utils';
import type { Entity } from '@tstdl/database';
import type { ElasticsearchIndexMapping, ElasticsearchIndexSettings } from './model';
import { ElasticsearchSearchIndex } from './search-index';

const logger = getCoreLogger();

type EntityType = Entity & {
  tag: string,
  channel: string
};

const client = new Client({
  node: 'http://localhost:9200'
});

export const elasticsearchSettings: ElasticsearchIndexSettings = {
  refresh_interval: '3s'
};

export const elasticsearchMapping: ElasticsearchIndexMapping<any> = {
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

// eslint-disable-next-line max-statements
async function test(): Promise<void> {
  const searchIndex = new ElasticsearchSearchIndex<EntityType>(client, 'testindex', elasticsearchSettings, elasticsearchMapping, getCoreLogger());

  const exists = await searchIndex.exists();

  if (exists) {
    await searchIndex.drop();
  }

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
