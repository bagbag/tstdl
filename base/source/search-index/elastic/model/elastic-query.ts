import type { estypes } from '@elastic/elasticsearch';

export type ElasticQuery = estypes.QueryDslQueryContainer;

export type ElasticBooleanQuery = Required<Pick<estypes.QueryDslQueryContainer, 'bool'>>;

export type ElasticIdsQuery = Required<Pick<estypes.QueryDslQueryContainer, 'ids'>>;

export type ElasticMatchAllQuery = Required<Pick<estypes.QueryDslQueryContainer, 'match_all'>>;

export type ElasticRangeQuery = Required<Pick<estypes.QueryDslQueryContainer, 'range'>>;

export type ElasticRegexQuery = Required<Pick<estypes.QueryDslQueryContainer, 'regexp'>>;

export type ElasticTermQuery = Required<Pick<estypes.QueryDslQueryContainer, 'term'>>;

export type ElasticTermsQuery = Required<Pick<estypes.QueryDslQueryContainer, 'terms'>>;

export type ElasticMatchQuery = Required<Pick<estypes.QueryDslQueryContainer, 'match'>>;

export type ElasticExistsQuery = Required<Pick<estypes.QueryDslQueryContainer, 'exists'>>;

export type ElasticMultiMatchQuery = Required<Pick<estypes.QueryDslQueryContainer, 'multi_match'>>;

export type ElasticGeoBoundingBoxQuery = Required<Pick<estypes.QueryDslQueryContainer, 'geo_bounding_box'>>;

export type ElasticGeoDistanceQuery = Required<Pick<estypes.QueryDslQueryContainer, 'geo_distance'>>;

export type ElasticGeoPolygonQuery = Required<Pick<estypes.QueryDslQueryContainer, 'geo_polygon'>>;

export type ElasticGeoShapeQuery = Required<Pick<estypes.QueryDslQueryContainer, 'geo_shape'>>;
