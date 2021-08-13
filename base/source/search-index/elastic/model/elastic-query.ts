import type { QueryDslQueryContainer } from '@elastic/elasticsearch/api/types';

export type ElasticQuery = QueryDslQueryContainer;

export type ElasticBooleanQuery = Required<Pick<QueryDslQueryContainer, 'bool'>>;

export type ElasticIdsQuery = Required<Pick<QueryDslQueryContainer, 'ids'>>;

export type ElasticMatchAllQuery = Required<Pick<QueryDslQueryContainer, 'match_all'>>;

export type ElasticRangeQuery = Required<Pick<QueryDslQueryContainer, 'range'>>;

export type ElasticRegexQuery = Required<Pick<QueryDslQueryContainer, 'regexp'>>;

export type ElasticTermQuery = Required<Pick<QueryDslQueryContainer, 'term'>>;

export type ElasticTermsQuery = Required<Pick<QueryDslQueryContainer, 'terms'>>;

export type ElasticMatchQuery = Required<Pick<QueryDslQueryContainer, 'match'>>;

export type ElasticMultiMatchQuery = Required<Pick<QueryDslQueryContainer, 'multi_match'>>;
