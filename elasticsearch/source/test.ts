import { Client } from '@elastic/elasticsearch';
import { getCoreLogger } from '@tstdl/base/instance-provider';
import type { Entity } from '@tstdl/database';
import type { ElasticsearchIndexMapping, ElasticsearchIndexSettings } from './model';
import { ElasticsearchSearchIndex } from './search-index';
import { MatchAllQueryBuilder, TextQueryBuilder } from '@tstdl/search-index/query/builder';

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
      index: true
    }
  }
};

async function test(): Promise<void> {
  const searchIndex = new ElasticsearchSearchIndex<EntityType>(client, 'testindex', elasticsearchSettings, elasticsearchMapping, getCoreLogger());
  await searchIndex.drop();
  await searchIndex.initialize();

  await searchIndex.index([
    { id: 'id1', tag: 'foobar1', channel: 'Hello World from here1' },
    { id: 'id2', tag: 'foobar2', channel: 'Hello World from here2' },
    { id: 'id3', tag: 'foobar3', channel: 'Hello World from here3' }
  ]);

  await searchIndex.refresh();

  const queryBuilder = new MatchAllQueryBuilder();
  // queryBuilder.fields('channel').text('Hello');

  await searchIndex.search({ body: queryBuilder.build() });
}

void test().catch((error: Error) => console.error(error));
