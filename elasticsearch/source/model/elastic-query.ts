import type { QueryContainer } from '@elastic/elasticsearch/api/types';

export type ElasticQuery = QueryContainer;

export type ElasticBooleanQuery = Required<Pick<QueryContainer, 'bool'>>;

export type ElasticIdsQuery = Required<Pick<QueryContainer, 'ids'>>;

export type ElasticMatchAllQuery = Required<Pick<QueryContainer, 'match_all'>>;

export type ElasticRangeQuery = Required<Pick<QueryContainer, 'range'>>;

export type ElasticRegexQuery = Required<Pick<QueryContainer, 'regexp'>>;

export type ElasticTermQuery = Required<Pick<QueryContainer, 'term'>>;

export type ElasticTermsQuery = Required<Pick<QueryContainer, 'terms'>>;

export type ElasticMatchQuery = Required<Pick<QueryContainer, 'match'>>;

export type ElasticMultiMatchQuery = Required<Pick<QueryContainer, 'multi_match'>>;
