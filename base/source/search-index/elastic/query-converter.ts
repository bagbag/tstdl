/* eslint-disable @typescript-eslint/naming-convention */

import type { Entity } from '#/database/index.js';
import type { ComparisonEqualsQuery, ComparisonExistsQuery, ComparisonGeoDistanceQuery, ComparisonGeoShapeQuery, ComparisonGreaterThanOrEqualsQuery, ComparisonGreaterThanQuery, ComparisonInQuery, ComparisonLessThanOrEqualsQuery, ComparisonLessThanQuery, ComparisonNotEqualsQuery, ComparisonNotInQuery, ComparisonRegexQuery, ComparisonTextQuery, LogicalAndQuery, LogicalNorQuery, LogicalOrQuery, Query, TextSpanQuery, TextSpanQueryMode } from '#/database/query.js';
import { hasOwnProperty, objectEntries, objectValues } from '#/utils/object/object.js';
import { assertDefinedPass, isPrimitive, isRegExp, isString } from '#/utils/type-guards.js';
import type { estypes } from '@elastic/elasticsearch';
import type { ElasticExistsQuery, ElasticGeoDistanceQuery, ElasticGeoShapeQuery, ElasticMatchQuery, ElasticMultiMatchQuery, ElasticQuery, ElasticRangeQuery, ElasticRegexQuery, ElasticTermQuery, ElasticTermsQuery } from './model/index.js';
import { BoolQueryBuilder } from './query-builder/index.js';

// eslint-disable-next-line max-lines-per-function, max-statements, complexity
export function convertQuery<T extends Entity>(query: Query<T>): ElasticQuery {
  const defaultBoolQueryBuilder = new BoolQueryBuilder();

  const queryEntries = objectEntries(query);

  // eslint-disable-next-line no-unreachable-loop
  for (const [rawProperty, value] of queryEntries) {
    const property = getPropertyName(rawProperty);
    const isPrimitiveValue = isPrimitive(value);
    const range: estypes.QueryDslRangeQuery = {};

    let canHandleProperty = false;

    if (rawProperty == '$and') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalAndQuery((value as LogicalAndQuery['$and']));
    }

    if (rawProperty == '$or') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalOrQuery((value as LogicalOrQuery['$or']));
    }

    if (rawProperty == '$nor') {
      if (queryEntries.length > 1) {
        throw new Error('only one logical operator per level allowed');
      }

      return convertLogicalNorQuery((value as LogicalNorQuery['$nor']));
    }

    if (rawProperty == '$textSpan') {
      const { fields, text, mode, operator } = value as TextSpanQuery['$textSpan'];
      const type = convertTextSpanQueryMode(mode);
      const matchQuery: ElasticMultiMatchQuery = { multi_match: { fields, query: text, type, operator } };

      defaultBoolQueryBuilder.must(matchQuery);
      canHandleProperty = true;
    }

    if (isPrimitiveValue || hasOwnProperty(value, '$eq')) {
      const termQuery: ElasticTermQuery = {
        term: { [property]: isPrimitiveValue ? value : (value as ComparisonEqualsQuery).$eq }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$neq')) {
      const termQuery: ElasticTermQuery = {
        term: { [property]: (value as ComparisonNotEqualsQuery).$neq }
      };

      defaultBoolQueryBuilder.mustNot(termQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$exists')) {
      const existsQuery: ElasticExistsQuery = { exists: { field: property } };

      if ((value as ComparisonExistsQuery).$exists) {
        defaultBoolQueryBuilder.must(existsQuery);
      }
      else {
        defaultBoolQueryBuilder.mustNot(existsQuery);
      }

      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$in')) {
      const termQuery: ElasticTermsQuery = {
        terms: { [property]: (value as ComparisonInQuery).$in }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$nin')) {
      const termQuery: ElasticTermsQuery = {
        terms: { [property]: (value as ComparisonNotInQuery).$nin }
      };

      defaultBoolQueryBuilder.mustNot(termQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$lt')) {
      range.lt = (value as ComparisonLessThanQuery).$lt;
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$lte')) {
      range.lte = (value as ComparisonLessThanOrEqualsQuery).$lte;
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$gt')) {
      range.gt = (value as ComparisonGreaterThanQuery).$gt;
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$gte')) {
      range.gte = (value as ComparisonGreaterThanOrEqualsQuery).$gte;
      canHandleProperty = true;
    }

    if (objectValues(range).length > 0) {
      const rangeQuery: ElasticRangeQuery = { range: { [property]: range } };
      defaultBoolQueryBuilder.must(rangeQuery);
    }

    if (hasOwnProperty(value, '$regex')) {
      const regex = (value as ComparisonRegexQuery).$regex;

      const regexp: ElasticRegexQuery['regexp'][any] = isString(regex)
        ? regex
        : isRegExp(regex)
          ? ({ flags: regex.flags, value: regex.source } as estypes.QueryDslRegexpQuery)
          : ({ flags: regex.flags, value: regex.pattern } as estypes.QueryDslRegexpQuery);

      const termQuery: ElasticRegexQuery = {
        regexp: { property: regexp }
      };

      defaultBoolQueryBuilder.must(termQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$text')) {
      let matchQuery: ElasticMatchQuery;
      const textQueryValue = (value as ComparisonTextQuery).$text;

      if (typeof textQueryValue == 'string') {
        matchQuery = { match: { [property]: { query: textQueryValue } } };
      }
      else {
        matchQuery = { match: { [property]: { query: textQueryValue.text, operator: textQueryValue.operator } } };
      }

      defaultBoolQueryBuilder.must(matchQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$geoShape')) {
      const geoShapeQuery: ElasticGeoShapeQuery = {
        geo_shape: {
          [property]: {
            shape: (value as ComparisonGeoShapeQuery).$geoShape.geometry,
            relation: (value as ComparisonGeoShapeQuery).$geoShape.relation
          }
        }
      };

      defaultBoolQueryBuilder.must(geoShapeQuery);
      canHandleProperty = true;
    }

    if (hasOwnProperty(value, '$geoDistance')) {
      const distance = assertDefinedPass((value as ComparisonGeoDistanceQuery).$geoDistance.maxDistance, 'maxDistance required');

      const geoShapeQuery: ElasticGeoDistanceQuery = {
        geo_distance: {
          distance: `${distance}m`,
          [property]: [
            (value as ComparisonGeoDistanceQuery).$geoDistance.longitude,
            (value as ComparisonGeoDistanceQuery).$geoDistance.latitude
          ]
        }
      };

      defaultBoolQueryBuilder.must(geoShapeQuery);
      canHandleProperty = true;
    }

    if (!canHandleProperty) {
      throw new Error(`unsupported query type "${rawProperty}"`);
    }
  }

  if (defaultBoolQueryBuilder.totalQueries == 0) {
    return { match_all: {} };
  }

  return defaultBoolQueryBuilder.build();
}

function getPropertyName(property: string): string {
  return property == 'id' ? '_id' : property;
}

export function convertLogicalAndQuery<T extends Entity>(andQuery: LogicalAndQuery<T>['$and']): ElasticQuery {
  return new BoolQueryBuilder().must(...andQuery.map(convertQuery)).build();
}

export function convertLogicalOrQuery<T extends Entity>(orQuery: LogicalOrQuery<T>['$or']): ElasticQuery {
  return new BoolQueryBuilder().should(...orQuery.map(convertQuery)).build();
}

export function convertLogicalNorQuery<T extends Entity>(norQuery: LogicalNorQuery<T>['$nor']): ElasticQuery {
  return new BoolQueryBuilder().mustNot(...norQuery.map(convertQuery)).build();
}

export function convertTextSpanQueryMode(mode: TextSpanQueryMode | undefined): estypes.QueryDslTextQueryType | undefined {
  switch (mode) {
    case undefined:
      return undefined;

    case 'best':
      return 'best_fields';

    case 'most':
      return 'most_fields';

    case 'cross':
      return 'cross_fields';

    default:
      throw new Error('unknown ComplexTextSpanQueryMode');
  }
}
