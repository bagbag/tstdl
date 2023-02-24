import type { QueryDslQueryContainer } from '@elastic/elasticsearch/lib/api/types.js';

export type ElasticQuery = QueryDslQueryContainer;

export type ElasticBooleanQuery = Required<Pick<QueryDslQueryContainer, 'bool'>>;

export type ElasticIdsQuery = Required<Pick<QueryDslQueryContainer, 'ids'>>;

export type ElasticMatchAllQuery = Required<Pick<QueryDslQueryContainer, 'match_all'>>;

export type ElasticRangeQuery = Required<Pick<QueryDslQueryContainer, 'range'>>;

export type ElasticRegexQuery = Required<Pick<QueryDslQueryContainer, 'regexp'>>;

export type ElasticTermQuery = Required<Pick<QueryDslQueryContainer, 'term'>>;

export type ElasticTermsQuery = Required<Pick<QueryDslQueryContainer, 'terms'>>;

export type ElasticMatchQuery = Required<Pick<QueryDslQueryContainer, 'match'>>;

export type ElasticExistsQuery = Required<Pick<QueryDslQueryContainer, 'exists'>>;

export type ElasticMultiMatchQuery = Required<Pick<QueryDslQueryContainer, 'multi_match'>>;

export type ElasticGeoBoundingBoxQuery = Required<Pick<QueryDslQueryContainer, 'geo_bounding_box'>>;

export type ElasticGeoDistanceQuery = Required<Pick<QueryDslQueryContainer, 'geo_distance'>>;

export type ElasticGeoPolygonQuery = Required<Pick<QueryDslQueryContainer, 'geo_polygon'>>;

export type ElasticGeoShapeQuery = Required<Pick<QueryDslQueryContainer, 'geo_shape'>>;
