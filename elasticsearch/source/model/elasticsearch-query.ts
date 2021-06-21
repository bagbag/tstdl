import type { QueryContainer } from '@elastic/elasticsearch/api/types';

export type ElasticsearchQuery = QueryContainer;

export type ElasticsearchBooleanQuery = Required<Pick<QueryContainer, 'bool'>>;

export type ElasticsearchIdsQuery = Required<Pick<QueryContainer, 'ids'>>;

export type ElasticsearchMatchAllQuery = Required<Pick<QueryContainer, 'match_all'>>;

export type ElasticsearchRangeQuery = Required<Pick<QueryContainer, 'range'>>;

export type ElasticsearchRegexQuery = Required<Pick<QueryContainer, 'regexp'>>;

export type ElasticsearchTermQuery = Required<Pick<QueryContainer, 'term'>>;

export type ElasticsearchTermsQuery = Required<Pick<QueryContainer, 'terms'>>;

export type ElasticsearchMatchQuery = Required<Pick<QueryContainer, 'match'>>;

export type ElasticsearchMultiMatchQuery = Required<Pick<QueryContainer, 'multi_match'>>;
